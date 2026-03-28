/**
 * NBP (Narodowy Bank Polski) exchange rate client
 *
 * Rate semantics: 1 unit of foreign currency = `rate` PLN
 * e.g. getRate('CZK', ...) → { rate: 0.1623, ... } means 1 CZK = 0.1623 PLN
 *
 * Caches in Cloudflare KV for 26h (NBP publishes once daily ~12:00 Warsaw).
 * Falls back up to 5 calendar days for weekends/holidays/unpublished dates.
 */

export type ForeignCurrency = 'CZK' | 'EUR' | 'HUF'

export interface NbpRate {
  rate:     number  // 1 foreign unit = rate PLN (NBP table A mid rate)
  rateDate: string  // YYYY-MM-DD (NBP effectiveDate)
}

export async function getRate(
  currency: ForeignCurrency,
  date: Date,
  kv: KVNamespace,
): Promise<NbpRate> {
  const dateStr  = toDateStr(date)
  const cacheKey = `nbp_rate:${currency}:${dateStr}`

  // 1. KV cache check — avoids repeated NBP subrequests for same currency+day
  const cached = await kv.get(cacheKey)
  if (cached) return JSON.parse(cached) as NbpRate

  // 2. Fetch from NBP — walk back up to 5 days for weekends/holidays
  const attempt = new Date(date)
  for (let i = 0; i < 5; i++) {
    const attemptStr = toDateStr(attempt)
    const url        = `https://api.nbp.pl/api/exchangerates/rates/a/${currency.toLowerCase()}/${attemptStr}/?format=json`
    const res        = await fetch(url)

    if (res.status === 404) {
      attempt.setDate(attempt.getDate() - 1)
      continue
    }

    if (!res.ok) {
      throw new Error(`NBP API ${res.status} for ${currency} ${attemptStr}`)
    }

    const body  = await res.json() as { rates: Array<{ mid: number; effectiveDate: string }> }
    const entry = body.rates[0]
    if (!entry) throw new Error(`NBP API: empty rates for ${currency} ${attemptStr}`)

    const result: NbpRate = { rate: entry.mid, rateDate: entry.effectiveDate }

    // Cache 26h — covers next-day re-use before NBP publishes new rate
    await kv.put(cacheKey, JSON.stringify(result), { expirationTtl: 26 * 60 * 60 })
    return result
  }

  throw new Error(`NBP API: no rate for ${currency} within 5 days of ${dateStr}`)
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}
