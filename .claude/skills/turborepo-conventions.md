---
name: turborepo-conventions
description: >
  Manage the Il Buon Caffe Turborepo monorepo — shared packages, dependency graph, turbo.json pipelines,
  adding new packages or apps, and workspace configuration. Use this skill whenever the user works on
  monorepo structure, shared packages, build pipelines, workspace dependencies, or Turborepo configuration.
  Triggers on: "turbo", "turborepo", "monorepo", "workspace", "shared package", "new package",
  "add package", "dependency", "turbo.json", "pipeline", "build order", "packages/",
  or any structural question about how the repo is organized and how code is shared between apps.
---

# Turborepo Conventions Skill — Il Buon Caffe

Manage the Turborepo monorepo structure, shared packages, build pipelines, and workspace conventions.

## Project Structure

```
il-buon-caffe/
├── apps/
│   ├── web/        # Next.js 14 storefront + admin
│   ├── api/        # Cloudflare Workers (Hono.js)
│   └── admin/      # Electron desktop app (not started)
├── packages/
│   ├── db/         # Drizzle ORM schema + client
│   ├── types/      # Shared TypeScript types
│   └── ui/         # Shared UI components
├── docs/           # Architecture docs
├── turbo.json      # Pipeline configuration
├── package.json    # Root workspace config
└── pnpm-workspace.yaml
```

## Package Manager

This project uses **pnpm** with workspaces:

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

## turbo.json Pipeline

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "type-check": {
      "dependsOn": ["^build"]
    },
    "deploy": {
      "dependsOn": ["build"]
    },
    "db:generate": {
      "cache": false
    },
    "db:push": {
      "cache": false
    }
  }
}
```

Key rules:
- `^build` means "build my dependencies first" — so `web` waits for `db`, `types`, `ui` to build
- `dev` and `db:*` tasks are never cached
- `deploy` depends on a successful `build`

## Shared Packages

### `@packages/db`

Drizzle ORM schema and client, shared between `apps/api` and any other consumer:

```
packages/db/
├── src/
│   ├── schema/     # Table definitions
│   ├── client.ts   # Drizzle client factory
│   └── index.ts    # Barrel export
├── drizzle/        # Generated migrations
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

```json
// packages/db/package.json
{
  "name": "@packages/db",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

### `@packages/types`

Shared TypeScript types and Zod schemas:

```
packages/types/
├── src/
│   ├── api.ts        # API request/response types
│   ├── models.ts     # Domain model types
│   ├── allegro.ts    # Allegro API types
│   └── index.ts
├── package.json
└── tsconfig.json
```

### `@packages/ui`

Shared React components used by both storefront and admin:

```
packages/ui/
├── src/
│   ├── button.tsx
│   ├── input.tsx
│   ├── modal.tsx
│   ├── toast.tsx
│   └── index.ts
├── package.json
└── tsconfig.json
```

## Adding a New Shared Package

1. Create the directory and files:

```bash
mkdir -p packages/new-package/src
```

2. Create `package.json`:

```json
{
  "name": "@packages/new-package",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint src/",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

3. Create `tsconfig.json` extending the root config:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

4. Add as dependency to consuming apps:

```bash
cd apps/web
pnpm add @packages/new-package --workspace
```

5. pnpm will resolve it via the workspace protocol: `"@packages/new-package": "workspace:*"`

## Adding a New App

1. Create under `apps/`:

```bash
mkdir -p apps/new-app
cd apps/new-app
# Initialize (e.g., Next.js, Hono, etc.)
```

2. Reference shared packages:

```bash
pnpm add @packages/db @packages/types --workspace
```

3. Add scripts that match turbo.json tasks (`build`, `dev`, `lint`, `type-check`).

## Common Commands

```bash
# Development — all apps in parallel
turbo dev

# Development — single app
turbo dev --filter=web
turbo dev --filter=api

# Build everything
turbo build

# Build single app (with dependencies)
turbo build --filter=web

# Type-check everything
turbo type-check

# Lint everything
turbo lint

# Database operations
turbo db:generate --filter=db
turbo db:push --filter=db

# Add dependency to a specific workspace
pnpm add zod --filter=api
pnpm add @packages/db --filter=web --workspace

# Install all dependencies
pnpm install
```

## Import Conventions

When importing from shared packages, use the package name:

```typescript
// In apps/api
import { products, users } from '@packages/db';
import type { Product, CreateOrderRequest } from '@packages/types';

// In apps/web
import { Button, Modal } from '@packages/ui';
import type { Product } from '@packages/types';
```

Never use relative paths like `../../packages/db` — always use the workspace package name.

## TypeScript Path Resolution

The root `tsconfig.base.json` should not use `paths` for workspace packages — pnpm workspaces handle resolution. Each app's `tsconfig.json` extends the base and can add its own paths (e.g., `@/` for local `src/`).

```json
// apps/web/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./components/*"]
    }
  }
}
```
