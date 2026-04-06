'use client'

import { useState, Suspense } from 'react'
import {
  Settings, Link2, Bell, Shield, Store, Globe, Mail, Phone,
  Clock, CreditCard, Truck, Key, RefreshCw, Info, ChevronRight, Lock,
  Volume2, VolumeX, Play, ShoppingCart, CheckCircle2, LayoutGrid, Check,
  AlertTriangle, Eye,
} from 'lucide-react'
import { AllegroConnectView } from '@/admin/views/Allegro'
import { useUxSound, type UxSoundName } from '@/hooks/useUxSound'

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'general',       label: 'Ogólne',          icon: Store },
  { id: 'integrations',  label: 'Integracje',       icon: Link2 },
  { id: 'notifications', label: 'Powiadomienia',    icon: Bell },
  { id: 'sounds',        label: 'Dźwięki',          icon: Volume2 },
  { id: 'security',      label: 'Zabezpieczenia',   icon: Shield },
] as const

type TabId = typeof TABS[number]['id']

// ── General tab ───────────────────────────────────────────────────────────────
const GeneralTab = () => (
  <div className="space-y-8">
    <section>
      <h2 className="text-h3 text-[#1A1A1A] mb-1">Informacje o sklepie</h2>
      <p className="text-sm text-[#737373] mb-5">Podstawowe dane Twojej kawiarni widoczne dla klientów.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SettingField icon={Store} label="Nazwa sklepu" value="Il Buon Caffè" hint="Wyświetlana w nagłówku i paragonach" />
        <SettingField icon={Globe} label="Domena" value="ilbuoncaffe.pl" hint="Główna domena sklepu" readonly />
        <SettingField icon={Mail} label="E-mail kontaktowy" value="kontakt@ilbuoncaffe.pl" hint="Adres do korespondencji z klientami" />
        <SettingField icon={Phone} label="Telefon" value="+48 664 937 937" hint="Numer helpdesk (opcjonalny)" />
      </div>
    </section>

    <Divider />

    <section>
      <h2 className="text-h3 text-[#1A1A1A] mb-1">Regionalizacja</h2>
      <p className="text-sm text-[#737373] mb-5">Waluta, strefa czasowa i język interfejsu.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SettingSelect icon={CreditCard} label="Waluta" value="PLN — Polski złoty" options={['PLN — Polski złoty', 'EUR — Euro']} />
        <SettingSelect icon={Clock} label="Strefa czasowa" value="Europe/Warsaw (UTC+1)" options={['Europe/Warsaw (UTC+1)']} />
        <SettingSelect icon={Globe} label="Język admina" value="Polski" options={['Polski', 'English']} />
      </div>
    </section>

    <Divider />

    <section>
      <h2 className="text-h3 text-[#1A1A1A] mb-1">Domyślna wysyłka</h2>
      <p className="text-sm text-[#737373] mb-5">Ustawienia wysyłki stosowane przy nowych zamówieniach.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SettingSelect icon={Truck} label="Domyślny kurier" value="InPost Paczkomat" options={['InPost Paczkomat', 'DPD', 'GLS']} />
        <SettingField icon={CreditCard} label="Próg darmowej dostawy (PLN)" value="150" hint="0 = zawsze płatna dostawa" />
      </div>
    </section>

    <div className="flex justify-end pt-2">
      <SaveButton />
    </div>
  </div>
)

// ── Integrations tab ──────────────────────────────────────────────────────────
const IntegrationsTab = () => {
  const [activeIntegration, setActiveIntegration] = useState<'allegro' | null>('allegro')

  const integrations: Array<{
    id: 'allegro' | null
    name: string
    description: string
    logo: string
    statusColor: string
    statusLabel: string
    disabled?: boolean
  }> = [
    {
      id: 'allegro',
      name: 'Allegro',
      description: 'Marketplace — sprzedaż i synchronizacja zamówień',
      logo: '🛒',
      statusColor: 'bg-[#059669]',
      statusLabel: 'Konfiguracja dostępna',
    },
    {
      id: null,
      name: 'InPost',
      description: 'Generowanie etykiet i śledzenie paczek',
      logo: '📦',
      statusColor: 'bg-[#737373]',
      statusLabel: 'Wkrótce',
      disabled: true,
    },
    {
      id: null,
      name: 'PayU',
      description: 'Bramka płatności online',
      logo: '💳',
      statusColor: 'bg-[#737373]',
      statusLabel: 'Wkrótce',
      disabled: true,
    },
    {
      id: null,
      name: 'Fakturownia',
      description: 'Automatyczne wystawianie faktur VAT',
      logo: '🧾',
      statusColor: 'bg-[#737373]',
      statusLabel: 'Wkrótce',
      disabled: true,
    },
  ]

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#737373]">Zarządzaj połączeniami z zewnętrznymi platformami i usługami.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {integrations.map(int => (
          <button
            key={int.name}
            onClick={() => !int.disabled && int.id && setActiveIntegration(int.id)}
            disabled={int.disabled}
            className={`text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
              activeIntegration === int.id
                ? 'border-[#0066CC] bg-[#EFF6FF]'
                : int.disabled
                  ? 'border-[#E5E4E1] bg-[#FAF9F7] opacity-60 cursor-not-allowed'
                  : 'border-[#E5E4E1] hover:border-[#C8C7C3] hover:bg-[#F5F4F1] cursor-pointer'
            }`}
          >
            <div className="text-2xl mb-3">{int.logo}</div>
            <p className="text-sm font-semibold text-[#1A1A1A]">{int.name}</p>
            <p className="text-xs text-[#737373] mt-0.5 leading-tight">{int.description}</p>
            <div className="mt-3 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${int.statusColor}`} />
              <span className="text-xs text-[#737373]">{int.statusLabel}</span>
            </div>
          </button>
        ))}
      </div>

      {activeIntegration === 'allegro' && (
        <div className="animate-in slide-in-from-bottom-2 fade-in duration-300">
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[#E5E4E1]">
            <span className="text-2xl">🛒</span>
            <div>
              <h2 className="text-h3 text-[#1A1A1A]">Allegro — OAuth2</h2>
              <p className="text-sm text-[#737373]">Połączenie z kontem sprzedawcy na Allegro</p>
            </div>
          </div>
          <Suspense fallback={<div className="h-24 flex items-center justify-center text-sm text-[#737373]">Ładowanie…</div>}>
            <AllegroConnectView />
          </Suspense>
        </div>
      )}
    </div>
  )
}

// ── Notifications tab ─────────────────────────────────────────────────────────
const NotificationsTab = () => (
  <div className="space-y-8">
    <section>
      <h2 className="text-h3 text-[#1A1A1A] mb-1">Powiadomienia e-mail</h2>
      <p className="text-sm text-[#737373] mb-5">Wybierz, o czym chcesz być powiadamiany na skrzynkę administracyjną.</p>
      <div className="space-y-3">
        {([
          { label: 'Nowe zamówienie',        sub: 'Każde zamówienie złożone w sklepie lub na Allegro',     defaultOn: true  },
          { label: 'Zamówienie do wysyłki',  sub: 'Gdy zamówienie zmieni status na "opłacone"',             defaultOn: true  },
          { label: 'Zwrot / reklamacja',     sub: 'Klient złożył wniosek o zwrot lub reklamację',           defaultOn: true  },
          { label: 'Niski stan magazynowy',  sub: 'Produkty z ilością poniżej progu (domyślnie 5 szt.)',    defaultOn: false },
          { label: 'Token Allegro wygasa',   sub: 'Przypomnienie 1h przed wygaśnięciem tokenu OAuth2',      defaultOn: true  },
          { label: 'Raport dzienny',         sub: 'Podsumowanie sprzedaży wysyłane o 23:00',                defaultOn: false },
        ] as const).map(item => (
          <NotificationToggle key={item.label} label={item.label} sub={item.sub} defaultOn={item.defaultOn} />
        ))}
      </div>
    </section>

    <Divider />

    <section>
      <h2 className="text-h3 text-[#1A1A1A] mb-1">Adres odbiorcy</h2>
      <p className="text-sm text-[#737373] mb-5">Powiadomienia są wysyłane na poniższy adres.</p>
      <SettingField icon={Mail} label="E-mail administratora" value="kontakt@ilbuoncaffe.pl" hint="Zmień na własny adres" />
    </section>

    <div className="flex justify-end pt-2">
      <SaveButton />
    </div>
  </div>
)
// ── Sounds tab ──────────────────────────────────────────────────────────────────

const SOUND_LIST: Array<{ name: UxSoundName; label: string; desc: string; icon: React.ElementType }> = [
  { name: 'new-order',            label: 'Nowe zamówienie',        desc: 'G5→C6 — 2 tony wznoszące, 500 ms',   icon: ShoppingCart },
  { name: 'order-status-changed', label: 'Zmiana statusu',          desc: 'C6→E6 — 2 tony kwinty, 180 ms',     icon: CheckCircle2 },
  { name: 'kanban-drop',          label: 'Kanban — upuszczenie',    desc: 'Pitch-drop 600→400 Hz, 160 ms',      icon: LayoutGrid },
  { name: 'save-success',         label: 'Zapis zakończony',       desc: 'C6 glass bell, 280 ms',                icon: Check },
  { name: 'error',                label: 'Błąd / API error',        desc: 'A4→G4 opadające, 280 ms',            icon: AlertTriangle },
  { name: 'modal-open',           label: 'Otwarcie modala',          desc: 'E6 airy fade, 200 ms',                 icon: Eye },
]

const SoundsTab = () => {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('ux-sounds') !== 'off'
  })
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window === 'undefined') return 70
    return Math.round(Number(localStorage.getItem('ux-sounds-volume') ?? 0.7) * 100)
  })
  const [playing, setPlaying] = useState<UxSoundName | null>(null)
  const { play } = useUxSound()

  const handleToggle = (on: boolean) => {
    setEnabled(on)
    localStorage.setItem('ux-sounds', on ? 'on' : 'off')
  }

  const handleVolume = (val: number) => {
    setVolume(val)
    localStorage.setItem('ux-sounds-volume', String(val / 100))
  }

  const handlePreview = (name: UxSoundName) => {
    // Temporarily force enable for preview even if sounds are off
    const prev = localStorage.getItem('ux-sounds')
    localStorage.setItem('ux-sounds', 'on')
    setPlaying(name)
    play(name)
    setTimeout(() => {
      setPlaying(null)
      if (prev === 'off') localStorage.setItem('ux-sounds', 'off')
      else localStorage.setItem('ux-sounds', 'on')
    }, 800)
  }

  return (
    <div className="space-y-8">
      {/* Master toggle */}
      <section>
        <h2 className="text-h3 text-[#1A1A1A] mb-1">Dźwięki UX</h2>
        <p className="text-sm text-[#737373] mb-5">
          Subtelne potwierdzenia dźwiękowe akcji w panelu. Generowane in-browser (Web Audio API), bez zewnętrznych plików.
        </p>
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#FAF9F7] border border-[#E5E4E1]">
          <div className="flex items-center gap-3">
            {enabled ? <Volume2 size={18} className="text-[#0066CC]" /> : <VolumeX size={18} className="text-[#737373]" />}
            <div>
              <p className="text-sm font-medium text-[#1A1A1A]">Włącz dźwięki panelu</p>
              <p className="text-xs text-[#737373]">Potwierdzenia, błędy, nowe zamówienia</p>
            </div>
          </div>
          <button
            onClick={() => handleToggle(!enabled)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${enabled ? 'bg-[#0066CC]' : 'bg-[#D1D0CB]'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </section>

      <Divider />

      {/* Volume slider */}
      <section>
        <h2 className="text-h3 text-[#1A1A1A] mb-1">Głośność</h2>
        <p className="text-sm text-[#737373] mb-5">Reguluje siłę wszystkich dźwięków w panelu.</p>
        <div className="p-5 rounded-xl bg-[#FAF9F7] border border-[#E5E4E1]">
          <div className="flex items-center gap-4">
            <VolumeX size={16} className="text-[#737373] shrink-0" />
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={e => handleVolume(Number(e.target.value))}
              className="flex-1 h-2 rounded-full accent-[#0066CC] cursor-pointer"
            />
            <Volume2 size={16} className="text-[#737373] shrink-0" />
            <span className="text-sm font-mono font-semibold text-[#1A1A1A] w-10 text-right">{volume}%</span>
          </div>
        </div>
      </section>

      <Divider />

      {/* Sound previews */}
      <section>
        <h2 className="text-h3 text-[#1A1A1A] mb-1">Sprawdzenie dźwięków</h2>
        <p className="text-sm text-[#737373] mb-5">Kliknij Odtwórz, aby usłyszeć każdy dŻwięk z aktualną głośnością.</p>
        <div className="space-y-2">
          {SOUND_LIST.map(({ name, label, desc, icon: Icon }) => (
            <div key={name} className="flex items-center justify-between p-4 rounded-xl bg-[#FAF9F7] border border-[#E5E4E1]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-[#0066CC]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A]">{label}</p>
                  <p className="text-xs text-[#737373] font-mono">{desc}</p>
                </div>
              </div>
              <button
                onClick={() => handlePreview(name)}
                disabled={playing === name}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  playing === name
                    ? 'bg-[#0066CC] text-white'
                    : 'bg-white border border-[#E5E4E1] text-[#525252] hover:border-[#0066CC] hover:text-[#0066CC]'
                }`}
              >
                <Play size={12} className={playing === name ? 'animate-pulse' : ''} />
                {playing === name ? 'Gra…' : 'Odtwórz'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
// ── Security tab ──────────────────────────────────────────────────────────────
const SecurityTab = () => (
  <div className="space-y-8">
    <section>
      <h2 className="text-h3 text-[#1A1A1A] mb-1">Sesje administracyjne</h2>
      <p className="text-sm text-[#737373] mb-5">Zarządzaj sesjami i tokenami JWT adminów.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <InfoCard icon={Key}       label="Algorytm JWT"     value="HS256 / HS512"    sub="Rotacja secretów obsługiwana automatycznie"                    color="blue"  />
        <InfoCard icon={Clock}     label="Czas sesji"       value="24h"              sub="Sliding session — przedłużana przy każdym żądaniu"             color="green" />
        <InfoCard icon={Lock}      label="Ochrona trasy"    value="Edge Middleware"  sub="Przekierowanie na /admin/login przy braku tokenu"              color="blue"  />
        <InfoCard icon={RefreshCw} label="Rotacja secretów" value="Automatyczna"     sub="ADMIN_JWT_SECRET_OLD — transparentna rotacja bez przestoju"    color="green" />
      </div>
    </section>

    <Divider />

    <section>
      <h2 className="text-h3 text-[#1A1A1A] mb-1">Zmiana hasła administratora</h2>
      <p className="text-sm text-[#737373] mb-5">Hasło jest przechowywane jako bcrypt hash w bazie danych.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SettingField icon={Key} label="Aktualne hasło" value="" hint="Wymagane do zmiany" type="password" />
        <SettingField icon={Key} label="Nowe hasło"     value="" hint="Min. 12 znaków, duże litery i cyfry" type="password" />
      </div>
      <div className="flex justify-end mt-5">
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FECACA] transition-colors">
          <Key size={16} /> Zmień hasło
        </button>
      </div>
    </section>

    <Divider />

    <section>
      <h2 className="text-h3 text-[#1A1A1A] mb-1">Infrastruktura</h2>
      <p className="text-sm text-[#737373] mb-5">Dane konfiguracyjne środowiska produkcyjnego (tylko do odczytu).</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {([
          ['API runtime',      'Cloudflare Workers (Edge)'],
          ['Baza danych',      'Neon PostgreSQL (Serverless)'],
          ['Cache / KV',       'Cloudflare KV'],
          ['Frontend hosting', 'Cloudflare Pages'],
          ['Szyfrowanie API',  'TLS 1.3'],
          ['Szyfrowanie DB',   'AES-256-GCM (tokeny OAuth)'],
        ] as const).map(([label, value]) => (
          <div key={label} className="flex justify-between p-4 rounded-xl bg-[#FAF9F7] border border-[#E5E4E1]">
            <span className="text-sm text-[#737373]">{label}</span>
            <span className="text-sm font-medium text-[#1A1A1A]">{value}</span>
          </div>
        ))}
      </div>
    </section>
  </div>
)

// ── Main page component ───────────────────────────────────────────────────────
export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('general')

  const content: Record<TabId, React.ReactNode> = {
    general:       <GeneralTab />,
    integrations:  <IntegrationsTab />,
    notifications: <NotificationsTab />,
    sounds:        <SoundsTab />,
    security:      <SecurityTab />,
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-h2 text-[#1A1A1A] flex items-center gap-3">
          <Settings size={28} className="text-[#0066CC]" />
          Ustawienia
        </h1>
        <p className="text-sm text-[#737373] mt-2">
          Konfiguracja systemu, integracje zewnętrzne i preferencje administracyjne
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-[#F5F4F1] rounded-2xl p-1.5 mb-8 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                active ? 'bg-white text-[#0066CC] shadow-sm' : 'text-[#737373] hover:text-[#1A1A1A]'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="animate-in fade-in duration-200">
        {content[activeTab]}
      </div>
    </div>
  )
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Divider() {
  return <hr className="border-[#E5E4E1]" />
}

function SaveButton() {
  return (
    <button className="btn-primary flex items-center gap-2 px-6 py-2.5">
      <ChevronRight size={16} /> Zapisz zmiany
    </button>
  )
}

function SettingField({
  icon: Icon, label, value, hint, readonly = false, type = 'text',
}: {
  icon: React.ElementType; label: string; value: string
  hint?: string; readonly?: boolean; type?: 'text' | 'password'
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-[#737373] uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Icon size={13} /> {label}
      </label>
      <input
        type={type}
        defaultValue={value}
        readOnly={readonly}
        className={`w-full px-4 py-3 rounded-xl border border-[#E5E4E1] text-sm text-[#1A1A1A] bg-white outline-none transition-colors focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/10 ${
          readonly ? 'opacity-60 cursor-default' : ''
        }`}
      />
      {hint && <p className="text-xs text-[#737373] mt-1.5">{hint}</p>}
    </div>
  )
}

function SettingSelect({
  icon: Icon, label, value, options,
}: {
  icon: React.ElementType; label: string; value: string; options: string[]
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-[#737373] uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Icon size={13} /> {label}
      </label>
      <select
        defaultValue={value}
        className="w-full px-4 py-3 rounded-xl border border-[#E5E4E1] text-sm text-[#1A1A1A] bg-white outline-none transition-colors focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/10 cursor-pointer"
      >
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  )
}

function NotificationToggle({ label, sub, defaultOn }: { label: string; sub: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-[#FAF9F7] border border-[#E5E4E1]">
      <div className="flex items-center gap-3">
        <Bell size={16} className={on ? 'text-[#0066CC]' : 'text-[#737373]'} />
        <div>
          <p className="text-sm font-medium text-[#1A1A1A]">{label}</p>
          <p className="text-xs text-[#737373]">{sub}</p>
        </div>
      </div>
      <button
        onClick={() => setOn(v => !v)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${on ? 'bg-[#0066CC]' : 'bg-[#D1D0CB]'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

function InfoCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType; label: string; value: string; sub: string; color: 'blue' | 'green'
}) {
  const c = { blue: { bg: 'bg-[#EFF6FF]', text: 'text-[#0066CC]' }, green: { bg: 'bg-[#ECFDF5]', text: 'text-[#059669]' } }[color]
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-[#FAF9F7] border border-[#E5E4E1]">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.bg}`}>
        <Icon size={16} className={c.text} />
      </div>
      <div>
        <p className="text-xs text-[#737373] font-medium uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-[#1A1A1A] mt-0.5">{value}</p>
        <p className="text-xs text-[#737373] mt-0.5 flex items-center gap-1"><Info size={11} /> {sub}</p>
      </div>
    </div>
  )
}
