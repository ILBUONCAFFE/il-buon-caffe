# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the admin dashboard from a generic SaaS template into an editorial "Daily Brief" that feels human-designed, not AI-generated.

**Architecture:** Typography-first layout with asymmetric grid. Kill 5 unused/redundant components (QuickActions, SalesQualityCard, WeeklyChart, MetricCard, StatCard). Replace with 2 new components (DashboardGreeting, HeroMetrics, AlertStrip) and redesign 3 existing ones (RevenueChart, OrdersTable, ActivityFeed, AllegroStatusCard). No backend/hook changes.

**Tech Stack:** React 19, Tailwind CSS 4, Recharts, Lucide icons, existing useDashboard hooks

---

## File Structure

### New files:
- `apps/web/src/admin/views/Dashboard/components/DashboardGreeting.tsx` — Time-aware greeting + date
- `apps/web/src/admin/views/Dashboard/components/HeroMetrics.tsx` — Three big naked metrics
- `apps/web/src/admin/views/Dashboard/components/AlertStrip.tsx` — Compact horizontal alert bar

### Modified files:
- `apps/web/src/admin/views/Dashboard/index.tsx` — Complete rewrite of layout
- `apps/web/src/admin/views/Dashboard/components/RevenueChart.tsx` — Redesign: cleaner, editorial
- `apps/web/src/admin/views/Dashboard/components/OrdersTable.tsx` — Redesign: tighter, no card wrap
- `apps/web/src/admin/views/Dashboard/components/ActivityFeed.tsx` — Redesign: compact timeline
- `apps/web/src/admin/views/Dashboard/components/AllegroStatusCard.tsx` — Redesign: compact inline

### Deleted files:
- `apps/web/src/admin/views/Dashboard/components/MetricCard.tsx`
- `apps/web/src/admin/views/Dashboard/components/StatCard.tsx`
- `apps/web/src/admin/views/Dashboard/components/QuickActions.tsx`
- `apps/web/src/admin/views/Dashboard/components/SalesQualityCard.tsx`
- `apps/web/src/admin/views/Dashboard/components/WeeklyChart.tsx`
- `apps/web/src/admin/views/Dashboard/components/SecondaryMetrics.tsx`

### Untouched files (safe):
- `apps/web/src/admin/hooks/useDashboard.ts` — all hooks preserved
- `apps/web/src/admin/hooks/useAnimatedCounter.ts` — still used by HeroMetrics
- `apps/web/src/admin/lib/adminApiClient.ts` — no changes
- `apps/web/src/admin/types/admin-api.ts` — no changes
- `apps/web/src/admin/components/OrderDetailModal.tsx` — still used by OrdersTable
- `apps/web/src/admin/utils/getStatusBadge.tsx` — still used by OrdersTable
- `apps/web/src/admin/components/ui/Dropdown.tsx` — still used by OrdersTable
- `apps/web/src/admin/components/ui/OrganicIcon.tsx` — still used by ActivityFeed

---

### Task 1: Create DashboardGreeting component

**Files:**
- Create: `apps/web/src/admin/views/Dashboard/components/DashboardGreeting.tsx`

- [ ] **Step 1:** Create time-aware greeting component with Polish date formatting
- [ ] **Step 2:** Verify it renders standalone

---

### Task 2: Create HeroMetrics component

**Files:**
- Create: `apps/web/src/admin/views/Dashboard/components/HeroMetrics.tsx`

- [ ] **Step 1:** Create typography-first metrics display (no card wrappers, no icon circles)
- [ ] **Step 2:** Wire to useDashboardStats hook, include animated counters and trend indicators

---

### Task 3: Create AlertStrip component

**Files:**
- Create: `apps/web/src/admin/views/Dashboard/components/AlertStrip.tsx`

- [ ] **Step 1:** Create compact horizontal alert bar showing low stock + Allegro status
- [ ] **Step 2:** Wire to useDashboardOverview and useAllegroStatus hooks
- [ ] **Step 3:** Conditionally render — hide when everything is OK

---

### Task 4: Redesign RevenueChart

**Files:**
- Modify: `apps/web/src/admin/views/Dashboard/components/RevenueChart.tsx`

- [ ] **Step 1:** Remove card-light wrapper, use section-style layout
- [ ] **Step 2:** Cleaner typography, minimal grid lines, editorial feel
- [ ] **Step 3:** Full-width optimized layout

---

### Task 5: Redesign OrdersTable

**Files:**
- Modify: `apps/web/src/admin/views/Dashboard/components/OrdersTable.tsx`

- [ ] **Step 1:** Remove card-light wrapper
- [ ] **Step 2:** Tighter row spacing, cleaner typography
- [ ] **Step 3:** Keep all functionality (filter, modal, source badges)

---

### Task 6: Redesign ActivityFeed

**Files:**
- Modify: `apps/web/src/admin/views/Dashboard/components/ActivityFeed.tsx`

- [ ] **Step 1:** Compact timeline layout with time-first display
- [ ] **Step 2:** Reduce visual weight — smaller icons, tighter spacing

---

### Task 7: Redesign AllegroStatusCard

**Files:**
- Modify: `apps/web/src/admin/views/Dashboard/components/AllegroStatusCard.tsx`

- [ ] **Step 1:** Compact inline card for bottom row (not standalone card)
- [ ] **Step 2:** Keep all data: connection status, token expiry, account, manage link

---

### Task 8: Rewrite DashboardView layout

**Files:**
- Modify: `apps/web/src/admin/views/Dashboard/index.tsx`

- [ ] **Step 1:** Wire all new/redesigned components into new layout
- [ ] **Step 2:** New structure: Greeting → HeroMetrics → AlertStrip → RevenueChart → OrdersTable → bottom split (ActivityFeed + AllegroStatus)

---

### Task 9: Delete unused components

**Files:**
- Delete: `MetricCard.tsx`, `StatCard.tsx`, `QuickActions.tsx`, `SalesQualityCard.tsx`, `WeeklyChart.tsx`, `SecondaryMetrics.tsx`

- [ ] **Step 1:** Delete all 6 files
- [ ] **Step 2:** Verify no other imports reference them (grep)

---

### Task 10: Visual verification

- [ ] **Step 1:** Run `turbo dev --filter=web` and verify dashboard loads
- [ ] **Step 2:** Check for TypeScript errors with `turbo type-check`
