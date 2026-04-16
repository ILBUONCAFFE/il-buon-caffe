# Kawiarnia Page Redesign

**Date:** 2026-04-16
**Status:** Design — pending approval
**Path:** `apps/web/src/app/kawiarnia/page.tsx` → renders `CafeClient`

## Goal

Replace the current 6-section "luxury café" template with an editorial 5-section page that reads like a printed Italian café card, not a generic AI landing page.

## Cuts

Delete (move to `_deprecated/` or remove from import — see Cleanup):
- `ScrollRevealSentence.tsx` — abstract poetic line, redundant with hero quote
- `DayTimeline.tsx` — "morning → evening" abstraction, no concrete value
- `Ritual.tsx` — manifesto, third philosophical section in a row
- `TastingMenu.tsx` — tabs widget hides menu behind interaction
- `CafeHeroButtons.tsx` — tabs no longer needed without TastingMenu sections

Keep & refactor: `CafeClient.tsx`, `Location.tsx` (lightly).

## New Section Structure

### 1. Hero — `CafeHero.tsx` (new)

Full-bleed `/assets/kawiarnia.jpg`. Replace the current heavy 3-layer dark gradient with a single soft bottom-only gradient (`from-brand-900/85 via-brand-900/30 to-transparent`, top-up). Content sits in the bottom-left, not centered.

**Content (bottom-left, max-w-2xl):**
- Small eyebrow: `KOSZALIN · OD 2003` (uppercase tracking-widest, font-mono, brand-300)
- H1: `Il Buon Caffe` (large serif, white, no handwriting accent)
- One short line: `Kawiarnia & delikatesy przy ul. Biskupa Domina.` (white/80)
- Compact info row: hours today + phone, separated by middle-dot

No quote in hero. No tabs. No scroll indicator. No giant centered title.

**Why this is not slop:** the page identifies itself by *place and date*, not by abstract atmosphere words. Bottom-left composition reads like editorial photography, not a hero template.

### 2. Menu — `MenuCard.tsx` (new)

A single printed-card layout, all three categories visible at once on desktop (3 columns), stacked on mobile. No tabs. No icons next to category names. No card-per-item.

**Per category column:**
- Category name in serif italic (e.g. *Klasyki kawowe*) with a thin brand-300 hairline below
- Items as a tight `<dl>`-style list:
  ```
  Espresso ································· 8,00
  Cappuccino ······························ 14,00
  ```
  - Name in serif, dotted leader fills space (CSS `border-bottom: dotted` trick on a flex spacer), price in mono-tabular
  - Description in smaller text below name, brand-700, only when it adds info (skip "Oryginalne" — obvious)
- Polish currency: `8,00 zł` becomes `8,00` with a single `zł` legend at column footer (less visual noise)

**Background:** `bg-brand-beige` (page bg), with a subtle paper texture via SVG noise (`<filter>` with `feTurbulence`) — adds tactile feel without an image.

**Why this is not slop:** menus belong on paper. Reading horizontally across categories matches how Italian café menus are actually printed. No interaction needed to see what's available.

### 3. Inside — `Inside.tsx` (new)

Asymmetric photo collage, max 3 images. Since we only have `kawiarnia.jpg` + `about-bakery.png` + `about-deli.png`, use these. Layout (desktop):

```
┌────────────────────┬─────────────┐
│                    │  bakery     │
│   kawiarnia.jpg    ├─────────────┤
│   (large, 2/3)     │  deli       │
└────────────────────┴─────────────┘
```

Mobile: stacked, with smaller two below the main photo.

One short caption beneath, left-aligned, 1–2 sentences max:
> *Lokal działa od 2003 roku. Espresso, świeże wypieki, włoskie delikatesy — kupisz wszystko na miejscu.*

No "manifesto." No "ritual." No three-paragraph story. Show the place, name what's there, move on.

**Why this is not slop:** real photos with one factual caption beat poetic prose. The asymmetric grid breaks the predictable 3-column equal-card pattern.

### 4. Hours & Address — `Visit.tsx` (refactor of `Location.tsx`)

Keep the embedded Google Map iframe (existing setup is good). Restructure the info panel:

- Two-column desktop, stacked mobile
- **Left:** map (current iframe, lighter filter — `grayscale(0.6) contrast(1.05) brightness(0.9)` instead of the current heavy darkening, since the section is no longer a hero)
- **Right:** clean info card on `bg-brand-beige`:
  - Address (serif, 2 lines)
  - Opening hours as a clean table (Pn–Pt 09:00–16:00 / So 11:00–14:00 / Nd zamknięte)
  - Phone & email (clickable)
  - Two small icon links: Instagram, Facebook
  - One CTA button: `Wyznacz trasę` → opens Google Maps

Drop the current map filter that makes the map nearly black. Drop the `bg-brand-950` section background.

### 5. The personality moment — inside `Visit.tsx` footer or below

**One** italic line at the very bottom of the page, centered, max-w-xl, brand-700/60:
> *„Najlepsza kawa to ta, którą pijesz nie spiesząc się."*

That's it. No section header. No card. No animation flourish. Just one line as a sign-off.

## Visual Language Rules

These apply across all new sections:

- **No multi-layer gradient overlays.** Max one gradient per section, and only where genuinely needed (hero bottom fade).
- **No `filter: blur()` enter animations.** Use simple `opacity 0→1` + `y: 12→0` only. The current page over-uses blur transitions.
- **No icon-per-feature.** Lucide icons appear only in the Visit section (clock, map pin, phone) and Instagram/Facebook footer. Not in menu, not in hero.
- **One serif font** for all headings. The handwriting font (`font-handwriting`) is not used on this page — it reads as decoration.
- **Numerals in tabular-nums** for prices and times.
- **Polish typographic quotes** `„ "` not straight `" "` in copy.

## Animation Budget

- Hero: subtle parallax (translateY 0→100px) on scroll. Drop the `scale 1→1.1` zoom — feels stocky.
- Menu, Inside, Visit: `whileInView` opacity+y fade once, `duration: 0.5`, no stagger orchestration.
- Cut all `filter: blur` transitions across the page.

## File Plan

| Action | File |
|---|---|
| New | `apps/web/src/components/Cafe/CafeHero.tsx` |
| New | `apps/web/src/components/Cafe/MenuCard.tsx` |
| New | `apps/web/src/components/Cafe/Inside.tsx` |
| Refactor | `apps/web/src/components/Cafe/Location.tsx` — keep filename, rename exported component to `Visit`, update import in `CafeClient.tsx` |
| Refactor | `apps/web/src/components/Cafe/CafeClient.tsx` — orchestrate new 5 sections only |
| Delete | `apps/web/src/components/Cafe/ScrollRevealSentence.tsx` |
| Delete | `apps/web/src/components/Cafe/DayTimeline.tsx` |
| Delete | `apps/web/src/components/Cafe/Ritual.tsx` |
| Delete | `apps/web/src/components/Cafe/TastingMenu.tsx` |
| Delete | `apps/web/src/components/Cafe/CafeHeroButtons.tsx` |
| Keep | `apps/web/src/lib/constants.ts` — `CAFE_MENU` data is reused by new `MenuCard` |
| Keep | `apps/web/src/app/kawiarnia/page.tsx` — JSON-LD + metadata unchanged |

## Out of Scope

- New photography commission (use what we have)
- Menu data changes (use existing `CAFE_MENU`)
- Mobile nav changes
- SEO/metadata changes (already good)
- Any change to `/sklep`, `/encyklopedia`, or other routes

## Acceptance

The redesigned page:
1. Loads with hero (single image, bottom-left text), menu card visible with all items at once (no tabs), inside collage of 3 real photos, visit info with map + clean address card, one closing italic line.
2. No `ScrollRevealSentence`, `DayTimeline`, `Ritual`, `TastingMenu`, `CafeHeroButtons` rendered or imported anywhere.
3. No multi-layer gradient overlays, no blur-filter animations, no handwriting font on this page.
4. Existing `CAFE_MENU` data renders correctly under the new `MenuCard` layout.
5. Mobile (375px), tablet (768px), desktop (1280px) all read cleanly.
