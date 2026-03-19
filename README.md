# ☕ Il Buon Caffè

> Luksusowe delikatesy online - kawiarnia, sklep, integracja z Allegro

![Stack](https://img.shields.io/badge/Stack-Next.js%2014%20%7C%20Cloudflare%20Workers%20%7C%20Neon%20PostgreSQL-blue)
![Status](<https://img.shields.io/badge/Status-W%20Rozwoju%20(Faza%201)-yellow>)

---

## 🎯 O Projekcie

**Il Buon Caffè** to kompletna platforma e-commerce dla luksusowych delikatesów:

- 🛒 **Sklep WWW** - Next.js 14 z App Router
- 👨‍💻 **Panel Admin** - Electron desktop app z offline mode
- 🔗 **Integracja Allegro** - Automatyczna synchronizacja zamówień i stocku
- ⚡ **Edge-First** - Wszystko na Cloudflare (Workers, Pages, R2, KV)

---

## 📚 Dokumentacja

| Dokument                                   | Opis                                    |
| ------------------------------------------ | --------------------------------------- |
| [📐 Architektura](./docs/ARCHITECTURE.md)  | Pełna dokumentacja architektury systemu |
| [📡 API Reference](./docs/API.md)          | Dokumentacja endpointów API             |
| [🚀 Deployment](./docs/DEPLOYMENT.md)      | Instrukcja wdrożenia                    |
| [📋 Plan Działania](./Plan%20działania.md) | Roadmap 16-tygodniowy                   |

---

## 🏗️ Struktura Projektu

```
il-buon-caffe/
├── apps/
│   ├── web/              # Next.js 14 (sklep www)
│   ├── api/              # Cloudflare Workers (Hono)
│   └── admin/            # Electron + React
├── packages/
│   ├── db/               # Drizzle schema (shared)
│   ├── types/            # TypeScript types (shared)
│   └── ui/               # Komponenty UI (shared)
└── docs/                 # Dokumentacja
```

---

## 🛠️ Stack Technologiczny

| Warstwa  | Technologia                          |
| -------- | ------------------------------------ |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend  | Cloudflare Workers, Hono.js          |
| Database | Neon PostgreSQL, Drizzle ORM         |
| Cache    | Cloudflare KV                        |
| Storage  | Cloudflare R2                        |
| Desktop  | Electron, React, Vite                |
| Auth     | JWT, API Keys                        |

---

## 🚀 Quick Start

```bash
# Instalacja zależności
pnpm install

# Uruchomienie dev
pnpm dev

# W osobnych terminalach:
cd apps/web && pnpm dev     # Frontend: http://localhost:3000
cd apps/api && pnpm dev     # API: http://localhost:8787
cd apps/admin && pnpm dev   # Electron
```

---

## 📊 Status Projektu

| Faza | Opis                         | Status       |
| ---- | ---------------------------- | ------------ |
| 1    | Foundation (Setup, DB, Auth) | 🟡 W trakcie |
| 2    | Core Shop (Orders, Payments) | ⚪ Planowane |
| 3    | Allegro Integration          | ⚪ Planowane |
| 4    | Electron Admin               | ⚪ Planowane |
| 5    | Testing & Polish             | ⚪ Planowane |
| 6    | Deploy                       | ⚪ Planowane |

---

## 📝 License

Private - All Rights Reserved

---

> **Il Buon Caffè** - Est. 2003, Koszalin
