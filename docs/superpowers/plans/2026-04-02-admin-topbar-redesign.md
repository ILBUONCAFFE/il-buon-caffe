# Admin Top Bar — Design & Layout Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the admin top bar to be visually unique, cohesive with the dashboard/orders views, and fully functional — covering search, notifications, user profile, and contextual actions.

**Architecture:** Replace the current flat header with a layered, information-rich top bar that combines contextual page info, quick actions, live status indicators, and refined dropdowns. All components use Framer Motion for micro-animations, the existing color palette (`#0066CC` accent, `#1A1A1A` text, `#F5F4F1` backgrounds), and the `rounded-2xl` / `shadow-2xl` dropdown pattern established in dashboard cards.

**Tech Stack:** React 19, Tailwind CSS 4, Framer Motion, Lucide icons, existing admin design tokens

---

## Design Philosophy

The top bar is the **command center** of the admin panel — always visible, always useful. Design principles:

1. **Density without clutter** — show maximum info in minimum space using smart layout
2. **Contextual awareness** — the bar adapts to the current page (different actions for orders vs dashboard)
3. **Micro-interactions** — every element responds to hover/click with subtle, purposeful animations
4. **Consistent depth** — dropdowns use the same `rounded-2xl shadow-2xl border-gray-100` pattern as dashboard cards
5. **Polish-language UI** — all labels in Polish

---

## File Structure

```
apps/web/src/admin/components/layout/
├── Header.tsx                    ← MODIFY — main top bar container, new layout
├── NotificationsPanel.tsx        ← MODIFY — redesigned notification dropdown  
├── UserMenu.tsx                  ← MODIFY — redesigned profile dropdown
├── SearchButton.tsx              ← CREATE — extracted search trigger component
├── QuickActions.tsx              ← CREATE — contextual page actions strip
├── StatusIndicators.tsx          ← CREATE — live status dots (Allegro, sync, etc.)
└── Breadcrumb.tsx                ← CREATE — smart breadcrumb with route context
```

---

## Overall Top Bar Layout

### Structure (left → right)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Breadcrumb]              [StatusDots]    [Search]  [Notif]  [UserAvatar] │
│  Il Buon Caffe / Zamówienia / Zarządzanie   ●●       ⌘K        🔔    [AK ▾]│
│                                                                             │
│  ── thin separator line ──────────────────────────────────────────────────  │
│  [QuickActions: contextual buttons for current page]                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Two-Row Header

The top bar becomes **two logical rows** within a single `h-auto` container (no fixed height):

**Row 1 — Navigation & Controls** (py-4 px-8):
- Left: Breadcrumb navigation
- Center-right: Status indicators (small dots)  
- Right: Search button, Notifications bell, User avatar+name

**Row 2 — Quick Actions Strip** (py-2.5 px-8, border-top `border-[#F5F4F1]`):
- Contextual action buttons that change per page
- Only visible when the current page has quick actions
- Animated show/hide with `AnimatePresence` (slide down, 200ms)

### Container Styling
```
bg-white/80 backdrop-blur-xl
border-b border-[#E5E4E1]
sticky top-0 z-40
transition-all duration-300
```

When scrolled: add `shadow-sm` via scroll detection (subtle depth on scroll).

---

## Task 1: Breadcrumb Component

**File:** Create `apps/web/src/admin/components/layout/Breadcrumb.tsx`

### Design Spec

```
Il Buon Caffe  /  Zamówienia  /  Zarządzanie zamówieniami
─────────────     ──────────     ────────────────────────
#A3A3A3 (link)    #525252        #1A1A1A (current, font-semibold)
text-sm           text-sm        text-sm
hover:text-[#0066CC]
```

- Each segment except the last is a clickable link with `hover:text-[#0066CC]` and subtle underline on hover
- Separator: `ChevronRight` icon (12px, `text-[#D4D3D0]`) — not a `/` slash
- Current page (last segment): `text-[#1A1A1A] font-semibold` — not clickable
- The breadcrumb replaces the current large `text-h1` title + subtitle — the page title moves to the main content area (each view's responsibility)
- On hover of a non-current segment, apply `transition-colors duration-150`
- Max 3 levels deep. If deeper, show `...` with tooltip

### Route Mapping

Use the existing `getRouteDetails` logic but expand it to produce an array of breadcrumb segments:

```
/admin                    → [Il Buon Caffe, Pulpit]
/admin/orders             → [Il Buon Caffe, Zamówienia, Zarządzanie]
/admin/orders/returns     → [Il Buon Caffe, Zamówienia, Zwroty]
/admin/inventory/products → [Il Buon Caffe, Magazyn, Produkty]
/admin/settings           → [Il Buon Caffe, Ustawienia]
```

- [ ] **Step 1:** Create `Breadcrumb.tsx` with route-to-segments mapping
- [ ] **Step 2:** Style breadcrumb segments with hover states and ChevronRight separators
- [ ] **Step 3:** Wire into Header.tsx replacing the current title + subtitle block

---

## Task 2: Status Indicators

**File:** Create `apps/web/src/admin/components/layout/StatusIndicators.tsx`

### Design Spec

Small, ambient status dots that sit between the breadcrumb and the controls. They communicate system health at a glance without demanding attention.

```
Layout:  ● Allegro   ● Sync   ● Zamówienia
         green dot    blue     amber (if pending)
```

Each indicator:
- **Dot**: `w-2 h-2 rounded-full` with color based on status
- **Label**: `text-xs text-[#A3A3A3]` — hidden by default, visible on hover of the group
- **Container**: `flex items-center gap-4` with `group` class
- **Hover behavior**: On hover of the container, labels fade in (`opacity-0 group-hover:opacity-100 transition-opacity duration-200`)

**Status Colors:**
| Status | Dot Color | Meaning |
|--------|-----------|---------|
| Allegro connected | `bg-[#059669]` (green) | OAuth token valid |
| Allegro expired | `bg-[#DC2626]` (red) + `animate-pulse` | Token needs refresh |
| Sync active | `bg-[#0066CC]` (blue) + `animate-pulse` | Sync in progress |
| Sync idle | `bg-[#D4D3D0]` (gray) | No sync running |
| Pending orders | `bg-[#D97706]` (amber) | Orders waiting for action |
| All clear | `bg-[#059669]` (green) | No issues |

**Tooltip on hover of individual dot:** Show expanded info in a tiny tooltip:
```
┌──────────────────────────┐
│ Allegro: Połączony       │
│ Token ważny do 15.04     │
└──────────────────────────┘
```
Tooltip: `px-3 py-2 rounded-lg bg-[#1A1A1A] text-white text-xs shadow-lg` — positioned above the dot.

- [ ] **Step 1:** Create `StatusIndicators.tsx` with dot + label layout
- [ ] **Step 2:** Add hover-reveal labels and tooltip on individual dots
- [ ] **Step 3:** Connect to dashboard data hooks for live status
- [ ] **Step 4:** Wire into Header.tsx center section

---

## Task 3: Search Button Redesign

**File:** Create `apps/web/src/admin/components/layout/SearchButton.tsx`

### Design Spec

The current search button is functional but plain. Redesign to be more prominent and visually integrated:

```
┌──────────────────────────────────┐
│  🔍  Szukaj w panelu...    ⌘K   │
└──────────────────────────────────┘
```

**Resting state:**
```
px-4 py-2.5 rounded-xl
bg-[#F5F4F1] (not white — slightly tinted to differentiate from the header bg)
border border-transparent
text-[#A3A3A3] text-sm
min-w-[220px]
```

**Hover state:**
```
bg-white
border-[#E5E4E1]
shadow-sm
transform: translateY(-1px)
transition: all 200ms cubic-bezier(0.25, 1, 0.5, 1)
```

**Active/Focus state:**
```
ring-2 ring-[#0066CC]/20
border-[#0066CC]
bg-white
```

**Keyboard shortcut badge:**
```
bg-white/80 backdrop-blur-sm
border border-[#E5E4E1]
px-1.5 py-0.5 rounded-md
text-[10px] font-medium text-[#A3A3A3]
flex items-center gap-0.5
```
Contains: `⌘` (Command icon 10px) + `K`

**Search icon:** `Search` (16px, `text-[#A3A3A3]`) — on hover morphs to `text-[#0066CC]` with 150ms transition

- [ ] **Step 1:** Create `SearchButton.tsx` with new styling
- [ ] **Step 2:** Add hover/focus micro-animations
- [ ] **Step 3:** Replace inline search button in Header.tsx

---

## Task 4: Notifications Panel Redesign

**File:** Modify `apps/web/src/admin/components/layout/NotificationsPanel.tsx`

### Bell Button Redesign

**Resting state:**
```
p-2.5 rounded-xl
bg-[#F5F4F1]
border border-transparent
relative
```

**Unread badge** (replaces the plain red dot):
```
absolute -top-1 -right-1
min-w-[18px] h-[18px]
bg-[#DC2626] text-white
text-[10px] font-bold
rounded-full
flex items-center justify-center
px-1
ring-2 ring-white
```
Shows the actual count number (e.g., "3"). If > 9, show "9+". Animate on new notification with `scale` spring animation.

**Hover state:** Same as search button — `bg-white border-[#E5E4E1] shadow-sm translateY(-1px)`

### Dropdown Panel Redesign

```
┌──────────────────────────────────────┐
│  Powiadomienia              3 nowe   │
│  ─────────────────────────────────── │
│                                      │
│  DZISIAJ                             │
│  ┌────────────────────────────────┐  │
│  │ 🛒  Nowe zamówienie #1847      │  │
│  │     Jan Kowalski · 245,00 zł   │  │
│  │     2 min temu            ●    │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ 💳  Płatność potwierdzona      │  │
│  │     Zamówienie #1845           │  │
│  │     15 min temu                │  │
│  └────────────────────────────────┘  │
│                                      │
│  WCZORAJ                             │
│  ┌────────────────────────────────┐  │
│  │ ⚠️  Niski stan magazynowy      │  │
│  │     Espresso Classico < 5 szt  │  │
│  │     wczoraj                    │  │
│  └────────────────────────────────┘  │
│                                      │
│  ─────────────────────────────────── │
│  Oznacz wszystkie jako przeczytane   │
│  Zobacz wszystkie →                  │
└──────────────────────────────────────┘
```

**Panel container:**
```
w-96 (wider than current w-80)
rounded-2xl
shadow-2xl
border border-[#E5E4E1]
bg-white
max-h-[480px]
overflow-hidden (scroll on inner content only)
```

**Header section:**
```
px-5 py-4
flex items-center justify-between
border-b border-[#F5F4F1]
```
- Title: `text-[15px] font-semibold text-[#1A1A1A]`
- Badge: `bg-[#0066CC] text-white text-xs px-2.5 py-0.5 rounded-full font-medium`

**Date group headers:**
```
px-5 py-2.5
text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]
bg-[#FAFAF9]
sticky top-0
```
Groups: "Dzisiaj", "Wczoraj", "Wcześniej" (Earlier)

**Notification item:**
```
px-5 py-4
flex items-start gap-3.5
transition-colors duration-150
hover:bg-[#F5F4F1]
cursor-pointer
border-b border-[#F5F4F1] last:border-b-0
```

**Icon container** (left):
```
w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
```
Background color by type:
| Type | Icon BG | Icon Color | Icon |
|------|---------|------------|------|
| order | `bg-[#EFF6FF]` | `text-[#0066CC]` | ShoppingCart (16px) |
| payment | `bg-[#ECFDF5]` | `text-[#059669]` | CreditCard (16px) |
| stock | `bg-[#FFFBEB]` | `text-[#D97706]` | AlertTriangle (16px) |
| allegro | `bg-[#FFF7ED]` | `text-[#EA580C]` | ShoppingBag (16px) |
| system | `bg-[#F5F4F1]` | `text-[#525252]` | Settings (16px) |

**Content** (right):
```
Title:   text-sm font-medium text-[#1A1A1A]
Message: text-sm text-[#737373] mt-0.5 line-clamp-2
Time:    text-xs text-[#A3A3A3] mt-1.5
```

**Unread indicator:** Instead of a blue dot, the entire item gets:
```
bg-[#FAFCFF] (very subtle blue tint)
border-l-2 border-[#0066CC] (left accent border — matches orders pending pattern)
```

**Footer:**
```
px-5 py-3
border-t border-[#F5F4F1]
flex items-center justify-between
bg-[#FAFAF9]
```
- Left: "Oznacz wszystkie jako przeczytane" — `text-xs text-[#737373] hover:text-[#1A1A1A]`
- Right: "Zobacz wszystkie →" — `text-xs font-medium text-[#0066CC] hover:text-[#0052A3]`

**Empty state:**
```
py-16 flex flex-col items-center gap-3
```
- Icon: `Bell` (32px) inside a `w-14 h-14 rounded-2xl bg-[#F5F4F1]` container, `text-[#A3A3A3]`
- Text: "Brak nowych powiadomień" — `text-sm text-[#A3A3A3]`
- Subtext: "Wszystko pod kontrolą" — `text-xs text-[#D4D3D0]`

**Animation:**
- Panel entrance: `initial={{ opacity: 0, y: -8, scale: 0.97 }}` → `animate={{ opacity: 1, y: 0, scale: 1 }}` (250ms, ease `[0.16, 1, 0.3, 1]`)
- Individual items: staggered fade-in with 30ms delay each (only on first open)

- [ ] **Step 1:** Redesign bell button with count badge
- [ ] **Step 2:** Restructure panel layout — header, date groups, footer
- [ ] **Step 3:** Style notification items with icon containers and unread left-border
- [ ] **Step 4:** Add empty state design
- [ ] **Step 5:** Add staggered item entrance animation
- [ ] **Step 6:** Add "mark all as read" button in footer

---

## Task 5: User Profile Dropdown Redesign

**File:** Modify `apps/web/src/admin/components/layout/UserMenu.tsx`

### Avatar Button Redesign

**Resting state:**
```
flex items-center gap-3
p-1.5 pr-4
rounded-xl
bg-[#F5F4F1] (matching search & bell bg)
border border-transparent
```

**Avatar circle:**
```
w-8 h-8 rounded-lg
bg-gradient-to-br from-[#0066CC] to-[#004499] (deeper gradient — more premium)
flex items-center justify-center
text-white font-semibold text-sm
shadow-inner (subtle inner shadow for depth)
```
Shows first letter of name ("A" for Admin). Later: real profile photo.

**Name + role display** (visible in top bar, next to avatar):
```
flex flex-col items-start
```
- Name: `text-sm font-medium text-[#1A1A1A]` — "Admin"
- Role: `text-[11px] text-[#A3A3A3]` — "Administrator"

**Chevron:** `ChevronDown` (12px, `text-[#A3A3A3]`) — rotates 180deg on open

**Hover:** `bg-white border-[#E5E4E1] shadow-sm`

### Dropdown Panel Redesign

```
┌──────────────────────────────────────┐
│  ┌──┐                                │
│  │AK│  Admin                         │
│  └──┘  admin@ilbuoncaffe.pl          │
│        Administrator                 │
│  ─────────────────────────────────── │
│                                      │
│  👤  Mój profil                      │
│  🎨  Wygląd                    →     │
│  ⚙️  Ustawienia                      │
│  ❓  Pomoc i wsparcie                │
│                                      │
│  ─────────────────────────────────── │
│                                      │
│  🏪  Il Buon Caffe                   │
│       ilbuoncaffe.pl    ↗            │
│                                      │
│  ─────────────────────────────────── │
│                                      │
│  🚪  Wyloguj się                     │
│                                      │
└──────────────────────────────────────┘
```

**Panel container:**
```
w-72 (wider than current w-56)
rounded-2xl
shadow-2xl
border border-[#E5E4E1]
bg-white
overflow-hidden
```

**Profile header section:**
```
px-5 py-4
flex items-center gap-3.5
border-b border-[#F5F4F1]
bg-[#FAFAF9]
```
- Large avatar: `w-11 h-11 rounded-xl bg-gradient-to-br from-[#0066CC] to-[#004499]` with initials (16px font)
- Name: `text-[15px] font-semibold text-[#1A1A1A]`
- Email: `text-sm text-[#737373]`
- Role badge: `text-[11px] text-[#0066CC] bg-[#EEF4FF] px-2 py-0.5 rounded-md font-medium mt-1 inline-block`

**Menu items section:**
```
py-2 px-2
```

Each item:
```
flex items-center gap-3
px-3 py-2.5
rounded-xl (rounded items — matches sidebar nav style)
text-sm text-[#525252]
transition-all duration-150
hover:bg-[#F5F4F1] hover:text-[#1A1A1A]
```
- Icon: 16px, same color as text
- Items with sub-menu (`Wygląd`): show `ChevronRight` (14px, `text-[#A3A3A3]`) on the right

**Menu items:**
| Icon | Label | Action |
|------|-------|--------|
| User (16px) | Mój profil | Navigate to profile |
| Palette (16px) | Wygląd | Sub-menu for theme (future) |
| Settings (16px) | Ustawienia | Navigate to settings |
| HelpCircle (16px) | Pomoc i wsparcie | Open help |

**Shop link section:**
```
mx-3 my-2
px-3 py-3
rounded-xl
bg-[#FAFAF9]
border border-[#F5F4F1]
flex items-center gap-3
hover:bg-[#F5F4F1]
cursor-pointer
```
- Shop icon: `Store` (16px, `text-[#737373]`)
- Shop name: `text-sm font-medium text-[#1A1A1A]` — "Il Buon Caffe"
- URL: `text-xs text-[#A3A3A3]` — "ilbuoncaffe.pl"
- External link icon: `ExternalLink` (12px, `text-[#A3A3A3]`) — opens storefront in new tab

**Logout section:**
```
px-2 py-2
border-t border-[#F5F4F1]
```
- Logout button:
```
w-full flex items-center gap-3
px-3 py-2.5 rounded-xl
text-sm text-[#DC2626]
hover:bg-[#FEF2F2]
transition-colors duration-150
```
Icon: `LogOut` (16px)

**Animation:**
- Same entrance as notifications: `y: -8, scale: 0.97, opacity: 0` → `y: 0, scale: 1, opacity: 1`
- Menu items: staggered fade-in (20ms delay each)

- [ ] **Step 1:** Redesign avatar button with name/role display
- [ ] **Step 2:** Create profile header section with large avatar and role badge
- [ ] **Step 3:** Style menu items with rounded-xl and icon alignment
- [ ] **Step 4:** Add shop link section with external link
- [ ] **Step 5:** Style logout section with danger color
- [ ] **Step 6:** Add staggered item entrance animation

---

## Task 6: Quick Actions Strip

**File:** Create `apps/web/src/admin/components/layout/QuickActions.tsx`

### Design Spec

A contextual action bar that appears below the main header row. It shows different buttons depending on the current page.

**Container:**
```
px-8 py-2.5
border-t border-[#F5F4F1]
flex items-center gap-2
bg-[#FAFAF9]/50
```

Wrapped in `AnimatePresence` — slides in/out when navigating between pages that do/don't have actions.

**Animation:**
```
initial={{ height: 0, opacity: 0 }}
animate={{ height: 'auto', opacity: 1 }}
exit={{ height: 0, opacity: 0 }}
transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
```

**Action button style (pill buttons):**
```
inline-flex items-center gap-2
px-3.5 py-1.5
rounded-lg
text-xs font-medium
border
transition-all duration-150
```

**Button variants:**

| Variant | Style |
|---------|-------|
| default | `bg-white border-[#E5E4E1] text-[#525252] hover:border-[#D4D3D0] hover:text-[#1A1A1A] hover:shadow-sm` |
| primary | `bg-[#0066CC] border-transparent text-white hover:bg-[#0052A3]` |
| warning | `bg-[#FFFBEB] border-[#FDE68A] text-[#92400E] hover:bg-[#FEF3C7]` |

**Per-page actions:**

| Page | Actions |
|------|---------|
| `/admin` (Dashboard) | Odśwież dane (refresh), Eksportuj raport (export) |
| `/admin/orders` | + Nowe zamówienie (primary), Eksportuj CSV, Filtruj zaawansowane |
| `/admin/inventory/products` | + Nowy produkt (primary), Import CSV, Synchronizuj Allegro |
| `/admin/customers` | Eksportuj bazę, Filtruj segmenty |
| `/admin/settings` | (no actions — strip hidden) |

Each button has a small icon (14px) on the left matching its function.

**Separator between groups:**
```
w-px h-5 bg-[#E5E4E1] mx-1
```

- [ ] **Step 1:** Create `QuickActions.tsx` with page-to-actions mapping
- [ ] **Step 2:** Style pill buttons in default/primary/warning variants
- [ ] **Step 3:** Add AnimatePresence slide animation
- [ ] **Step 4:** Wire into Header.tsx as second row

---

## Task 7: Header Container Assembly

**File:** Modify `apps/web/src/admin/components/layout/Header.tsx`

### Final Layout Assembly

```tsx
<header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#E5E4E1] transition-shadow duration-300"
        data-scrolled={isScrolled}>
  
  {/* Row 1: Navigation & Controls */}
  <div className="flex items-center justify-between px-8 py-4">
    
    {/* Left: Breadcrumb */}
    <Breadcrumb />
    
    {/* Right: Controls */}
    <div className="flex items-center gap-3">
      <StatusIndicators />
      
      {/* Thin vertical separator */}
      <div className="w-px h-6 bg-[#E5E4E1]" />
      
      <SearchButton onOpen={onOpenCommandPalette} />
      <NotificationsBell />
      <UserAvatarButton />
    </div>
  </div>
  
  {/* Row 2: Quick Actions (conditional) */}
  <AnimatePresence>
    {hasQuickActions && <QuickActions page={currentPage} />}
  </AnimatePresence>
</header>
```

**Scroll shadow detection:**
```tsx
const [isScrolled, setIsScrolled] = useState(false)

useEffect(() => {
  const handler = () => setIsScrolled(window.scrollY > 0)
  window.addEventListener('scroll', handler, { passive: true })
  return () => window.removeEventListener('scroll', handler)
}, [])
```

When `isScrolled`:
```
shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)]
```

**Control button consistency:**
All three control buttons (Search, Bell, Avatar) share the same base style:
```
bg-[#F5F4F1] border border-transparent rounded-xl
hover:bg-white hover:border-[#E5E4E1] hover:shadow-sm hover:-translate-y-[0.5px]
active:translate-y-0 active:shadow-none
transition-all duration-200 ease-[cubic-bezier(0.25,1,0.5,1)]
focus-visible:ring-2 focus-visible:ring-[#0066CC]/20 focus-visible:outline-none
```

This creates a uniform "tray" of tools that feel cohesive and premium.

**Gap between controls:** `gap-2` (tighter than current `gap-4` — buttons now have matching backgrounds so less gap needed)

- [ ] **Step 1:** Add scroll detection state
- [ ] **Step 2:** Restructure header into two-row layout
- [ ] **Step 3:** Import and wire all new components
- [ ] **Step 4:** Apply unified control button base styles
- [ ] **Step 5:** Add conditional QuickActions with AnimatePresence
- [ ] **Step 6:** Test visual coherence with dashboard and orders views

---

## Design Token Summary

All new components use these existing tokens (no new colors introduced):

| Token | Value | Usage |
|-------|-------|-------|
| Accent | `#0066CC` | Links, active states, unread indicators |
| Text Primary | `#1A1A1A` | Headings, current breadcrumb |
| Text Secondary | `#525252` | Menu items, body text |
| Text Tertiary | `#737373` | Timestamps, descriptions |
| Text Disabled | `#A3A3A3` | Placeholders, inactive labels |
| Border | `#E5E4E1` | Container borders, separators |
| Border Hover | `#D4D3D0` | Hover borders |
| BG Subtle | `#F5F4F1` | Button resting state, hover fills |
| BG Card | `#FAFAF9` | Panel headers, group headers |
| BG Page | `#FAF9F7` | Main content area |
| Success | `#059669` | Connected status, positive |
| Warning | `#D97706` | Low stock, pending |
| Error | `#DC2626` | Logout, disconnected, urgent |
| Info | `#0284C7` | Sync status |
| Allegro | `#EA580C` | Allegro-specific elements |

## Animation Consistency

All dropdowns follow the same animation pattern:
```tsx
initial={{ opacity: 0, y: -8, scale: 0.97 }}
animate={{ opacity: 1, y: 0, scale: 1 }}
exit={{ opacity: 0, y: -8, scale: 0.97 }}
transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
```

All hover transitions: `duration-150` to `duration-200` with `ease-[cubic-bezier(0.25,1,0.5,1)]`

---

## Visual Coherence Checklist

- [ ] Breadcrumb uses the same `text-sm` sizing as dashboard subtitle text
- [ ] Control buttons (`bg-[#F5F4F1]`) match the AlertStrip badge style from dashboard
- [ ] Dropdown panels use same `rounded-2xl shadow-2xl border-[#E5E4E1]` as dashboard cards
- [ ] Notification unread left-border (`border-l-2 border-[#0066CC]`) matches the pending order pattern in OrdersTable
- [ ] Status indicator dots match the Allegro/sync status dots on the AllegroStatusCard
- [ ] Quick action pill buttons use the same border/radius pattern as order status filter tabs
- [ ] All hover effects follow the same `-translate-y-[0.5px] shadow-sm` micro-lift pattern
- [ ] Typography hierarchy: 15px semibold (panel titles) → 14px/text-sm (content) → 11px/text-xs (labels, badges)
