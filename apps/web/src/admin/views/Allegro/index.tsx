'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Link2, Link2Off, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Clock, Shield, ExternalLink, User, Loader2, ShieldCheck, Terminal,
  KeyRound, ChevronDown, ChevronUp, Package,
} from 'lucide-react'
import { OrganicIcon } from '../../components/ui/OrganicIcon'
import { adminApi, ApiError } from '../../lib/adminApiClient'
import type { AllegroConnectionStatus, AllegroEnvironment } from '../../types/admin-api'

// ── Sub-components ────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: AllegroConnectionStatus | null }) => {
  if (!status) return null
  if (!status.connected)
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#737373]/10 text-[#737373]">
        <Link2Off size={14} /> Nie połączono
      </span>
    )
  if (!status.tokenValid)
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#DC2626]/10 text-[#DC2626]">
        <XCircle size={14} /> Token wygasł
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#059669]/10 text-[#059669]">
      <CheckCircle2 size={14} />
      Połączono {status.environment === 'sandbox' ? '(Sandbox)' : '(Produkcja)'}
    </span>
  )
}

interface AccountInfo {
  id: string
  login: string
  firstName?: string
  lastName?: string
  email?: string
  company?: { name: string }
}

const SetupGuidePanel = () => {
  const [open, setOpen] = useState(false)
  return (
    <div className="card-light overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-6 hover:bg-[#F5F4F1] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
            <Terminal size={16} className="text-[#0066CC]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1A1A1A]">Konfiguracja środowiska</p>
            <p className="text-xs text-[#737373]">Wymagane secrets w Cloudflare Workers</p>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-[#737373]" /> : <ChevronDown size={16} className="text-[#737373]" />}
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-[#E5E4E1] pt-4 space-y-4">
          <p className="text-sm text-[#525252]">
            Przed połączeniem z Allegro musisz skonfigurować secrets w Cloudflare Workers. Utwórz aplikację na{' '}
            <a href="https://apps.developer.allegro.pl" target="_blank" rel="noopener noreferrer" className="text-[#0066CC] hover:underline">
              apps.developer.allegro.pl
            </a>{' '}i ustaw:
          </p>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#737373] uppercase tracking-wider">Secrets (wrangler secret put)</p>
            {[
              ['ALLEGRO_CLIENT_ID',           'Client ID z panelu deweloperskiego Allegro'],
              ['ALLEGRO_CLIENT_SECRET',        'Client Secret z panelu deweloperskiego Allegro'],
              ['ALLEGRO_TOKEN_ENCRYPTION_KEY', '64-znakowy hex (32 bajty losowe) — klucz AES-256-GCM'],
            ].map(([key, desc]) => (
              <div key={key} className="p-3 rounded-lg bg-[#FAF9F7] border border-[#E5E4E1]">
                <code className="text-xs font-mono font-bold text-[#0066CC]">{key}</code>
                <p className="text-xs text-[#737373] mt-0.5">{desc}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#737373] uppercase tracking-wider">Vars (wrangler.json)</p>
            {[
              ['ALLEGRO_ENVIRONMENT',       '"sandbox" lub "production"'],
              ['ALLEGRO_REDIRECT_URI',      'URI zarejestrowane w aplikacji Allegro (callback)'],
              ['ALLEGRO_ADMIN_REDIRECT_URL','URL panelu admina (po powrocie z OAuth)'],
            ].map(([key, desc]) => (
              <div key={key} className="p-3 rounded-lg bg-[#FAF9F7] border border-[#E5E4E1]">
                <code className="text-xs font-mono font-bold text-[#525252]">{key}</code>
                <p className="text-xs text-[#737373] mt-0.5">{desc}</p>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-lg bg-[#FEF3C7] border border-[#D97706]/20">
            <p className="text-xs text-[#D97706]">
              <strong>Redirect URI</strong> w panelu Allegro musi być dokładnie:{' '}
              <code className="font-mono">https://api.ilbuoncaffe.pl/api/admin/allegro/callback</code>
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#F0F9FF] border border-[#0284C7]/20">
            <p className="text-xs text-[#0284C7] mb-1 font-semibold">Generowanie klucza szyfrowania:</p>
            <code className="text-xs font-mono text-[#525252]">
              node -e &quot;console.log(require(&apos;crypto&apos;).randomBytes(32).toString(&apos;hex&apos;))&quot;
            </code>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export const AllegroConnectView = () => {
  const searchParams = useSearchParams()
  const callbackStatus  = searchParams.get('status')
  const callbackMessage = searchParams.get('message')

  const [status, setStatus]             = useState<AllegroConnectionStatus | null>(null)
  const [loading, setLoading]           = useState(true)
  const [statusError, setStatusError]   = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [environment, setEnvironment]   = useState<AllegroEnvironment>('sandbox')
  const [feedback, setFeedback]         = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [accountInfo, setAccountInfo]   = useState<AccountInfo | null>(null)
  const [verifying, setVerifying]       = useState(false)
  const [syncing, setSyncing]           = useState(false)

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 6000)
  }

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setStatusError(null)
    try {
      const result = await adminApi.getAllegroStatus()
      setStatus(result.data)
      if (result.data.environment) setEnvironment(result.data.environment)
    } catch (e) {
      console.error('Allegro status fetch error:', e)
      let msg: string
      if (e instanceof ApiError && (e.status === 502 || e.status === 503)) {
        msg = e.message || 'Serwis API jest chwilowo niedostępny. Spróbuj ponownie za chwilę.'
      } else if (e instanceof ApiError && e.status === 401) {
        msg = 'Brak autoryzacji. Odświż stronę lub zaloguj się ponownie.'
      } else {
        msg = e instanceof Error ? e.message : 'Nie udało się pobrać statusu'
      }
      setStatusError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (callbackStatus === 'success') showFeedback('success', 'Połączono z Allegro! Token zapisany.')
    if (callbackStatus === 'error')   showFeedback('error',   callbackMessage ?? 'Błąd podczas połączenia z Allegro.')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callbackStatus, callbackMessage])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const handleConnect = async () => {
    setActionLoading(true)
    try {
      const result = await adminApi.getAllegroConnectUrl(environment)
      window.location.href = result.data.url
    } catch (e) {
      showFeedback('error', e instanceof Error ? e.message : 'Błąd generowania URL autoryzacji')
      setActionLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Na pewno rozłączyć konto Allegro? Synchronizacje przestaną działać.')) return
    setActionLoading(true)
    try {
      await adminApi.disconnectAllegro()
      setStatus(null)
      setAccountInfo(null)
      await fetchStatus()
      showFeedback('success', 'Rozłączono z Allegro.')
    } catch {
      showFeedback('error', 'Błąd rozłączania')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRefresh = async () => {
    setActionLoading(true)
    try {
      const result = await adminApi.refreshAllegroToken()
      await fetchStatus()
      showFeedback('success', `Token odświeżony. Wygaśnie: ${new Date(result.data.expiresAt).toLocaleString('pl-PL')}`)
    } catch (e) {
      showFeedback('error', e instanceof Error ? e.message : 'Błąd odświeżania tokenu')
    } finally {
      setActionLoading(false)
    }
  }

  const handleVerifyMe = async () => {
    setVerifying(true)
    try {
      const result = await adminApi.verifyAllegroAccount()
      setAccountInfo(result.data as unknown as AccountInfo)
      showFeedback('success', 'Token aktywny — konto zweryfikowane.')
    } catch (e) {
      showFeedback('error', e instanceof Error ? e.message : 'Token nieaktywny lub błąd API')
    } finally {
      setVerifying(false)
    }
  }

  const handleSyncOrders = async (full = false) => {
    setSyncing(true)
    try {
      const result = await adminApi.backfillAllegroOrders(full)
      showFeedback('success', result.message)
    } catch (e) {
      showFeedback('error', e instanceof Error ? e.message : 'Błąd synchronizacji zamówień')
    } finally {
      setSyncing(false)
    }
  }

  const tokenExpiresIn = () => {
    if (!status?.expiresAt) return null
    const diff = new Date(status.expiresAt).getTime() - Date.now()
    if (diff <= 0) return 'Wygasł'
    const h = Math.floor(diff / 3_600_000)
    const m = Math.floor((diff % 3_600_000) / 60_000)
    return h > 0 ? `${h}h ${m}min` : `${m} min`
  }

  return (
    <div className="space-y-6">
      {/* ── Feedback toast ──────────────────────────────────────────────── */}
      {feedback && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium animate-in slide-in-from-top-2 fade-in duration-300 ${
          feedback.type === 'success'
            ? 'bg-[#ECFDF5] border-[#059669]/20 text-[#059669]'
            : 'bg-[#FEF2F2] border-[#DC2626]/20 text-[#DC2626]'
        }`}>
          {feedback.type === 'success'
            ? <CheckCircle2 size={18} className="shrink-0" />
            : <XCircle size={18} className="shrink-0" />}
          {feedback.message}
        </div>
      )}

      {/* ── API unavailable banner ──────────────────────────────────────── */}
      {statusError && !loading && (
        <div className="flex items-start gap-3 p-4 rounded-xl border bg-[#FFF7ED] border-[#F97316]/20 text-[#9A3412]">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Nie można pobrać statusu Allegro</p>
            <p className="text-sm mt-0.5 text-[#C2410C]">{statusError}</p>
          </div>
          <button
            onClick={fetchStatus}
            className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#F97316]/10 hover:bg-[#F97316]/20 transition-all duration-300 hover:scale-[1.02] active:scale-95"
          >
            <RefreshCw size={12} /> Ponów
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: status card ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status card */}
          <div className="card-light p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <OrganicIcon
                  icon={status?.connected ? Shield : Link2Off}
                  bgColor={status?.connected && status.tokenValid ? 'bg-[#ECFDF5]' : 'bg-[#737373]/10'}
                  iconColor={status?.connected && status.tokenValid ? 'text-[#059669]' : 'text-[#737373]'}
                  size="lg"
                />
                <div>
                  <h3 className="text-h3 text-[#1A1A1A]">Status połączenia</h3>
                  <p className="text-sm text-[#737373] mt-0.5">Allegro REST API</p>
                </div>
              </div>
              {loading
                ? <Loader2 size={20} className="text-[#737373] animate-spin" />
                : <StatusBadge status={status} />}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Środowisko',  value: loading ? '—' : (status?.environment ?? 'Brak'), mono: false },
                { label: 'Wygasa za',   value: loading ? '—' : (tokenExpiresIn() ?? 'Brak'),   mono: true, danger: !status?.tokenValid },
              ].map(({ label, value, mono, danger }) => (
                <div key={label} className="p-4 rounded-xl bg-[#FAF9F7] border border-[#E5E4E1]">
                  <p className="text-label mb-1">{label}</p>
                  <p className={`text-sm font-semibold capitalize ${mono ? 'font-mono' : ''} ${danger ? 'text-[#DC2626]' : 'text-[#1A1A1A]'}`}>{value}</p>
                </div>
              ))}
              <div className="p-4 rounded-xl bg-[#FAF9F7] border border-[#E5E4E1]">
                <p className="text-label mb-1">Token</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {loading ? <span className="text-sm text-[#737373]">—</span>
                    : status?.tokenValid
                      ? <><CheckCircle2 size={14} className="text-[#059669]" /><span className="text-sm font-semibold text-[#059669]">Aktywny</span></>
                      : <><XCircle size={14} className="text-[#DC2626]" /><span className="text-sm font-semibold text-[#DC2626]">Nieaktywny</span></>}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {!status?.connected ? (
                <>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-[#737373]">Środowisko:</label>
                    <select
                      value={environment}
                      onChange={e => setEnvironment(e.target.value as AllegroEnvironment)}
                      className="admin-select w-auto font-medium"
                    >
                      <option value="sandbox">Sandbox (testy)</option>
                      <option value="production">Produkcja</option>
                    </select>
                  </div>
                  <button
                    onClick={handleConnect}
                    disabled={actionLoading}
                    className="btn-accent"
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                    Połącz z Allegro
                    <ExternalLink size={14} />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleVerifyMe} disabled={verifying} className="btn-secondary">
                    {verifying ? <Loader2 size={16} className="animate-spin" /> : <User size={16} />}
                    Zweryfikuj konto
                  </button>
                  <button onClick={() => handleSyncOrders(false)} disabled={syncing} className="btn-secondary">
                    {syncing ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                    Synchronizuj zamówienia
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Pełna synchronizacja pobierze WSZYSTKIE zamówienia z ostatnich 365 dni i może chwilę potrwać. Kontynuować?')) {
                        handleSyncOrders(true)
                      }
                    }}
                    disabled={syncing}
                    className="btn-secondary"
                    title="Resetuje kursor i importuje wszystkie zamówienia z ostatnich 365 dni"
                  >
                    {syncing ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                    Pełna synchronizacja
                  </button>
                  <button onClick={handleRefresh} disabled={actionLoading} className="btn-ghost">
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Odśwież token
                  </button>
                  <button onClick={handleDisconnect} disabled={actionLoading} className="btn-danger">
                    <Link2Off size={16} /> Rozłącz
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Account info after /me verify */}
          {accountInfo && (
            <div className="card-light p-6 border-l-4 border-[#059669]/40 animate-in slide-in-from-bottom-2 fade-in duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] flex items-center justify-center">
                  <ShieldCheck size={20} className="text-[#059669]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">Zweryfikowane konto Allegro</p>
                  <p className="text-xs text-[#737373]">Token aktywny i prawidłowy</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Login" value={accountInfo.login} />
                <InfoRow label="ID użytkownika" value={accountInfo.id} mono />
                {accountInfo.email && <InfoRow label="E-mail" value={accountInfo.email} />}
                {accountInfo.company?.name && <InfoRow label="Firma" value={accountInfo.company.name} />}
              </div>
            </div>
          )}

          {/* OAuth flow diagram */}
          <div className="card-light p-6">
            <h3 className="text-h3 text-[#1A1A1A] mb-4">Jak działa autoryzacja OAuth2?</h3>
            <div className="space-y-3">
              {[
                { step: '1', label: 'Kliknij „Połącz z Allegro"',      desc: 'System generuje URL z parametrem state (CSRF) i zapisuje go w KV na 10 minut' },
                { step: '2', label: 'Allegro — strona autoryzacji',     desc: 'Przeglądarka otwiera stronę Allegro. Zaloguj się i kliknij „Zezwól"' },
                { step: '3', label: 'Callback — wymiana kodu',          desc: 'Allegro wraca na nasz adres callback z kodem autoryzacyjnym. API Worker wymienia go na tokeny' },
                { step: '4', label: 'Zapis tokenów',                    desc: 'Access token i refresh token zapisywane w bazie (AES-256-GCM) i Cloudflare KV (szybki dostęp)' },
                { step: '5', label: 'Automatyczne odświeżanie',         desc: 'Cron Worker odświeża token co 11 godzin (access token ważny 12h)' },
              ].map(({ step, label, desc }) => (
                <div key={step} className="flex items-start gap-4 p-4 rounded-xl bg-[#FAF9F7] border border-[#E5E4E1]">
                  <div className="w-7 h-7 rounded-full bg-[#0066CC] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{step}</div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">{label}</p>
                    <p className="text-xs text-[#737373] mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: info cards ─────────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="card-light p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                <KeyRound size={16} className="text-[#0066CC]" />
              </div>
              <h3 className="text-h3 text-[#1A1A1A]">Bezpieczeństwo</h3>
            </div>
            <div className="space-y-3">
              {[
                { icon: Shield,        label: 'Szyfrowanie AES-256-GCM', sub: 'Tokeny szyfrowane w bazie danych' },
                { icon: Clock,         label: 'Auto-refresh co 11h',     sub: 'Token ważny 12h, odświeżany z marginesem' },
                { icon: AlertTriangle, label: 'CSRF state param',        sub: 'Każdy OAuth flow z unikalnym state (TTL 10min)' },
                { icon: CheckCircle2,  label: 'KV cache tokenów',        sub: 'Szybki dostęp bez zapytań do DB' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-[#FAF9F7]">
                  <Icon size={15} className="text-[#0066CC] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">{label}</p>
                    <p className="text-xs text-[#737373]">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-light p-6">
            <h3 className="text-h3 text-[#1A1A1A] mb-4">Rate limits API</h3>
            <div className="space-y-2">
              {[
                ['General API',   '~9 000 req/min'],
                ['Batch stock',   '250 000/h'],
                ['Batch prices',  '150 000/h'],
                ['Nasze zużycie', '~5 req/min'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-[#E5E4E1] last:border-0">
                  <span className="text-sm text-[#737373]">{label}</span>
                  <span className="text-sm font-mono font-medium text-[#1A1A1A]">{value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#059669] mt-3">✓ Zużycie &lt;2% dostępnych limitów</p>
          </div>

          <div className="card-light p-6">
            <h3 className="text-h3 text-[#1A1A1A] mb-4">Linki</h3>
            <div className="space-y-1">
              {[
                { label: 'Panel deweloperski Allegro', url: 'https://apps.developer.allegro.pl' },
                { label: 'Dokumentacja Allegro API',   url: 'https://developer.allegro.pl' },
                { label: 'Sandbox Allegro',            url: 'https://allegro.pl.allegrosandbox.pl' },
                { label: 'OAuth2 docs',                url: 'https://developer.allegro.pl/auth/' },
              ].map(({ label, url }) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-[#F5F4F1] transition-colors group">
                  <span className="text-sm text-[#525252] group-hover:text-[#1A1A1A]">{label}</span>
                  <ExternalLink size={13} className="text-[#737373]" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Setup guide ───────────────────────────────────────────────────── */}
      <SetupGuidePanel />
    </div>
  )
}

const InfoRow = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
  <div>
    <p className="text-label mb-0.5">{label}</p>
    <p className={`text-sm font-medium text-[#1A1A1A] ${mono ? 'font-mono' : ''}`}>{value}</p>
  </div>
)
