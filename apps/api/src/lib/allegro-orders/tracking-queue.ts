/**
 * Tracking Priority Queue — KV-backed scheduling for order tracking refreshes.
 *
 * Rozwiązuje bug "tych samych przesyłek w kółko":
 * Harmonogramowanie (nextCheckAt) żyje w tej kolejce KV — nie w DB trackingStatusUpdatedAt.
 * Po każdym sprawdzeniu (niezależnie od zmiany statusu) reschedule() resetuje nextCheckAt.
 *
 * KV scheme:
 *   tracking:queue:manifest          → QueueManifest JSON (główna kolejka, pisana przez cron)
 *   tracking:queue:pending:{orderId} → PendingEntry JSON (pisana przez handlery, drainowana przez cron)
 *   tracking:queue:tombstone:{orderId} → '1' TTL 48h (pisana przez reconcileOrder przy anulacji)
 */

export const QUEUE_MANIFEST_KEY = 'tracking:queue:manifest'
const QUEUE_PENDING_PREFIX = 'tracking:queue:pending:'
const QUEUE_TOMBSTONE_PREFIX = 'tracking:queue:tombstone:'
const QUEUE_MAX_AGE_DAYS = 32
const QUEUE_REBUILD_INTERVAL_MS = 25 * 60 * 60 * 1000 // 25 godzin

export interface QueueEntry {
  id: number        // orderId
  eid: string       // externalId (Allegro checkoutFormId)
  at: number        // nextCheckAt unix ms
  p: number         // priority 1–5 (niższy = pilniejszy)
  s: string | null  // ostatni znany trackingStatusCode
  ts: number        // addedAt unix ms (do pruning stale entries)
}

interface QueueManifest {
  v: 3
  entries: QueueEntry[]
  rebuilt: number  // unix ms ostatniego rebuildu z DB
}

interface PendingEntry {
  orderId: number
  externalId: string
  statusCode: string | null
}

/**
 * Mapuje trackingStatusCode na parametry harmonogramowania.
 * Spójna z logiką CASE w selectTrackingRefreshCandidates (zastąpioną przez tę funkcję).
 */
export function classifyTracking(code: string | null): { priority: number; cooldownMs: number } {
  const c = (code ?? '').toUpperCase()
  if (c.includes('OUT_FOR_DELIVERY') || c.includes('COURIER'))
    return { priority: 1, cooldownMs: 5 * 60 * 1000 }
  if (c.includes('EXCEPTION') || c.includes('RETURN') || c.includes('FAILED'))
    return { priority: 2, cooldownMs: 20 * 60 * 1000 }
  if (c.includes('IN_TRANSIT') || c.includes('TRANSIT') || c.includes('SENT'))
    return { priority: 3, cooldownMs: 30 * 60 * 1000 }
  if (c.includes('LABEL_CREATED') || c.includes('CREATED') || c.includes('REGISTERED'))
    return { priority: 4, cooldownMs: 90 * 60 * 1000 }
  // NULL / UNKNOWN / fallback
  return { priority: 5, cooldownMs: 60 * 60 * 1000 }
}

export class TrackingQueueManager {
  private map: Map<number, QueueEntry>
  private rebuilt: number
  private _pendingKeysToDelete: string[] = []
  private _tombstoneKeysToDelete: string[] = []

  private constructor(manifest: QueueManifest | null) {
    this.rebuilt = manifest?.rebuilt ?? 0
    this.map = new Map((manifest?.entries ?? []).map((e) => [e.id, e]))
  }

  /**
   * Wczytuje manifest z KV, drainuje pending entries, aplikuje tombstones.
   * Pending/tombstone klucze są usuwane DOPIERO po save() (safe-drain pattern —
   * przy crashu crona przed save(), klucze pozostają i będą przetworzone następnym razem).
   */
  static async load(kv: KVNamespace): Promise<TrackingQueueManager> {
    const raw = await kv.get(QUEUE_MANIFEST_KEY)
    let manifest: QueueManifest | null = null
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as QueueManifest
        if (parsed.v === 3) manifest = parsed
      } catch {
        // corrupt manifest — start fresh, rebuild z DB nastąpi przez needsRebuild
      }
    }

    const mgr = new TrackingQueueManager(manifest)

    // Drain pending entries (pisane przez event handlery w reconcileOrder)
    const pendingList = await kv.list({ prefix: QUEUE_PENDING_PREFIX })
    if (pendingList.keys.length > 0) {
      const values = await Promise.all(
        pendingList.keys.map((k) => kv.get(k.name).then((v) => ({ key: k.name, raw: v }))),
      )
      for (const { key, raw: v } of values) {
        if (!v) continue
        try {
          const entry = JSON.parse(v) as PendingEntry
          mgr._pendingEnqueue(entry.orderId, entry.externalId, entry.statusCode)
          mgr._pendingKeysToDelete.push(key)
        } catch {
          mgr._pendingKeysToDelete.push(key) // usuń corrupt wpis
        }
      }
    }

    // Aplikuj tombstones (pisane przez reconcileOrder przy anulacji)
    const tombstoneList = await kv.list({ prefix: QUEUE_TOMBSTONE_PREFIX })
    for (const key of tombstoneList.keys) {
      const orderId = parseInt(key.name.slice(QUEUE_TOMBSTONE_PREFIX.length), 10)
      if (!isNaN(orderId)) {
        mgr.map.delete(orderId)
        mgr._tombstoneKeysToDelete.push(key.name)
      }
    }

    return mgr
  }

  /**
   * Zapisuje manifest do KV, następnie usuwa przetworzone pending/tombstone klucze.
   * Cleanup po zapisie manifestu — gwarantuje brak utraty danych przy crashu.
   */
  async save(kv: KVNamespace): Promise<void> {
    const manifest: QueueManifest = {
      v: 3,
      entries: Array.from(this.map.values()),
      rebuilt: this.rebuilt,
    }
    await kv.put(QUEUE_MANIFEST_KEY, JSON.stringify(manifest))
    // Dopiero po udanym zapisie manifestu czyścimy klucze pomocnicze
    await Promise.all([
      ...this._pendingKeysToDelete.map((k) => kv.delete(k).catch(() => {})),
      ...this._tombstoneKeysToDelete.map((k) => kv.delete(k).catch(() => {})),
    ])
    this._pendingKeysToDelete = []
    this._tombstoneKeysToDelete = []
  }

  /**
   * Zwraca do `limit` wpisów których nextCheckAt <= now,
   * posortowanych priorytet ASC, nextCheckAt ASC.
   */
  getDue(limit: number, now = Date.now()): QueueEntry[] {
    return Array.from(this.map.values())
      .filter((e) => e.at <= now)
      .sort((a, b) => a.p - b.p || a.at - b.at)
      .slice(0, limit)
  }

  /**
   * Dodaj lub zaktualizuj wpis. Dla przebudowy z DB: podaj lastCheckedAt
   * żeby uszanować pozostały cooldown. Bez lastCheckedAt: at = now (natychmiast).
   */
  enqueue(
    orderId: number,
    externalId: string,
    statusCode: string | null,
    lastCheckedAt?: number,
  ): void {
    const existing = this.map.get(orderId)
    const now = Date.now()
    const { priority, cooldownMs } = classifyTracking(statusCode)
    const nextAt = lastCheckedAt
      ? Math.max(now, lastCheckedAt + cooldownMs) // uszanuj pozostały cooldown
      : now // brak historii = sprawdź od razu
    this.map.set(orderId, {
      id: orderId,
      eid: externalId,
      at: nextAt,
      p: priority,
      s: statusCode,
      ts: existing?.ts ?? now,
    })
  }

  /** Wewnętrzny enqueue z pending (zawsze at = now — nowe zdarzenie = sprawdź natychmiast). */
  private _pendingEnqueue(orderId: number, externalId: string, statusCode: string | null): void {
    const existing = this.map.get(orderId)
    const now = Date.now()
    const { priority } = classifyTracking(statusCode)
    this.map.set(orderId, {
      id: orderId,
      eid: externalId,
      at: now, // zawsze natychmiastowe sprawdzenie przy nowym zdarzeniu
      p: priority,
      s: statusCode,
      ts: existing?.ts ?? now,
    })
  }

  /**
   * Po sprawdzeniu: zaktualizuj statusCode i oblicz nowy nextCheckAt = now + cooldown.
   *
   * TO JEST SERCE FIXA: wywoływana po każdym sprawdzeniu, niezależnie od zmiany statusu.
   * Dzięki temu cooldown zawsze się resetuje i zamówienia nie wpadają w pętlę.
   */
  reschedule(orderId: number, statusCode: string | null): void {
    const existing = this.map.get(orderId)
    if (!existing) return
    const { priority, cooldownMs } = classifyTracking(statusCode)
    this.map.set(orderId, {
      ...existing,
      at: Date.now() + cooldownMs,
      p: priority,
      s: statusCode,
    })
  }

  /** Usuń wpis z kolejki (dostarczono, anulowano, stale). */
  remove(orderId: number): void {
    this.map.delete(orderId)
  }

  /** Usuń wpisy starsze niż cutoffDays (domyślnie QUEUE_MAX_AGE_DAYS = 32). */
  pruneStale(cutoffDays = QUEUE_MAX_AGE_DAYS): void {
    const cutoff = Date.now() - cutoffDays * 24 * 60 * 60 * 1000
    for (const [id, entry] of this.map) {
      if (entry.ts < cutoff) this.map.delete(id)
    }
  }

  get size(): number {
    return this.map.size
  }

  get dueCount(): number {
    return this.getDue(9999).length
  }

  /** True jeśli manifest nigdy nie był przebudowany lub minęło >25h od ostatniego rebuildu. */
  get needsRebuild(): boolean {
    return this.rebuilt === 0 || Date.now() - this.rebuilt > QUEUE_REBUILD_INTERVAL_MS
  }

  markRebuilt(): void {
    this.rebuilt = Date.now()
  }

  /** Informacyjny string do logów. */
  summary(): string {
    const due = this.getDue(9999).length
    const rebuiltStr = this.rebuilt
      ? new Date(this.rebuilt).toISOString()
      : 'never'
    return `size=${this.size} due=${due} rebuilt=${rebuiltStr}`
  }
}

// ── Static KV helpers dla event handlerów ────────────────────────────────────

/**
 * Wywoływana z reconcileOrder gdy zamówienie staje się trackable (SENT/PICKED_UP).
 * Pisze per-order pending klucz — bezpieczne przy równoczesnym przetwarzaniu zdarzeń
 * (każde zamówienie ma własny klucz, brak race condition read-modify-write).
 */
export async function enqueueTrackingOrder(
  kv: KVNamespace,
  orderId: number,
  externalId: string,
  statusCode: string | null,
): Promise<void> {
  const entry: PendingEntry = { orderId, externalId, statusCode }
  await kv.put(
    `${QUEUE_PENDING_PREFIX}${orderId}`,
    JSON.stringify(entry),
    { expirationTtl: 48 * 60 * 60 }, // auto-wygasa po 48h jeśli cron nie zdrainu
  )
}

/**
 * Wywoływana z reconcileOrder gdy zamówienie jest anulowane.
 * Tombstone aplikowany przez TrackingQueueManager.load() na następnym runie crona.
 */
export async function tombstoneTrackingOrder(
  kv: KVNamespace,
  orderId: number,
): Promise<void> {
  await kv.put(
    `${QUEUE_TOMBSTONE_PREFIX}${orderId}`,
    '1',
    { expirationTtl: 48 * 60 * 60 },
  )
}
