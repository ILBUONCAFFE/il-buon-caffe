# Kawiarnia Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 6-section "luxury café" template at `/kawiarnia` with a 5-section editorial layout: hero, menu card, inside collage, visit info, sign-off.

**Architecture:** Pure UI refactor. Reuses existing `CAFE_MENU` data from `apps/web/src/lib/constants.ts`, the existing hero photo `/assets/kawiarnia.jpg`, and the existing Google Maps iframe. New components live alongside existing ones in `apps/web/src/components/Cafe/`. No API, schema, or data changes.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, motion/react (Framer Motion), Lucide icons. All components are client components (`"use client"`) because they use motion/react.

**Spec:** `docs/superpowers/specs/2026-04-16-kawiarnia-redesign-design.md`

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `apps/web/src/components/Cafe/CafeHero.tsx` | Hero: full-bleed photo, bottom-left text, eyebrow + h1 + tagline + info row | Create |
| `apps/web/src/components/Cafe/MenuCard.tsx` | Menu: 3-column printed-card layout, dotted leaders, no tabs | Create |
| `apps/web/src/components/Cafe/Inside.tsx` | Photo collage (1 large + 2 stacked) with one-line caption | Create |
| `apps/web/src/components/Cafe/Location.tsx` | Refactor: rename component to `Visit`, lighter map filter, cleaner info card | Modify |
| `apps/web/src/components/Cafe/CafeClient.tsx` | Orchestrate 5 sections + closing sign-off line | Rewrite |
| `apps/web/src/components/Cafe/ScrollRevealSentence.tsx` | (deprecated) | Delete |
| `apps/web/src/components/Cafe/DayTimeline.tsx` | (deprecated) | Delete |
| `apps/web/src/components/Cafe/Ritual.tsx` | (deprecated) | Delete |
| `apps/web/src/components/Cafe/TastingMenu.tsx` | (deprecated) | Delete |
| `apps/web/src/components/Cafe/CafeHeroButtons.tsx` | (deprecated) | Delete |
| `apps/web/src/lib/constants.ts` | `CAFE_MENU` data | Unchanged |
| `apps/web/src/app/kawiarnia/page.tsx` | Server page with metadata + JSON-LD | Unchanged |

---

### Verification approach

Visual changes don't unit-test cleanly, so each task ends with a `turbo type-check --filter=web` step plus a manual browser verification step. The full visual QA (mobile/tablet/desktop) happens once at the end in Task 7.

---

## Task 1: Create CafeHero component

**Files:**
- Create: `apps/web/src/components/Cafe/CafeHero.tsx`

- [ ] **Step 1: Write the component**

Create `apps/web/src/components/Cafe/CafeHero.tsx`:

```tsx
"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const CafeHero: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative min-h-[88vh] md:min-h-screen overflow-hidden bg-brand-900"
    >
      <motion.div style={{ y }} className="absolute inset-0 z-0">
        <Image
          src="/assets/kawiarnia.jpg"
          alt="Wnętrze kawiarni Il Buon Caffe w Koszalinie"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/90 via-brand-900/30 to-brand-900/10" />
      </motion.div>

      <motion.div
        style={{ opacity }}
        className="relative z-10 flex min-h-[88vh] md:min-h-screen items-end"
      >
        <div className="container mx-auto px-6 lg:px-12 pb-16 md:pb-24">
          <div className="max-w-2xl">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="font-mono text-xs md:text-sm tracking-[0.25em] uppercase text-brand-300 mb-5"
            >
              Koszalin · od 2003
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: EASE }}
              className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-white tracking-tight leading-[1.02]"
            >
              Il Buon Caffe
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
              className="mt-6 text-lg md:text-xl text-white/80 max-w-xl leading-relaxed"
            >
              Kawiarnia & delikatesy przy ul. Biskupa Domina.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease: EASE }}
              className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/60 font-mono tabular-nums"
            >
              <span>Pn–Pt 09:00–16:00</span>
              <span aria-hidden className="text-brand-300/50">·</span>
              <span>So 11:00–14:00</span>
              <span aria-hidden className="text-brand-300/50">·</span>
              <a href="tel:+48664937937" className="hover:text-brand-300 transition-colors">
                +48 664 937 937
              </a>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default CafeHero;
```

- [ ] **Step 2: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/Cafe/CafeHero.tsx
git commit -m "feat(web): add CafeHero — bottom-left composition, single soft gradient"
```

---

## Task 2: Create MenuCard component

**Files:**
- Create: `apps/web/src/components/Cafe/MenuCard.tsx`

- [ ] **Step 1: Write the component**

The dotted leader uses a flex spacer with `border-bottom: 1px dotted` lifted slightly above the baseline so it sits between the name and the price. All three categories render in a 3-column grid on desktop; stacked on mobile.

Create `apps/web/src/components/Cafe/MenuCard.tsx`:

```tsx
"use client";

import React from "react";
import { motion } from "motion/react";
import { CAFE_MENU } from "@/lib/constants";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const formatPrice = (price: string): string => {
  // CAFE_MENU stores "8.00 zł" — strip " zł" and convert "." → "," for Polish style
  return price.replace(/\s*zł\s*$/i, "").replace(".", ",");
};

const MenuRow: React.FC<{ name: string; price: string; description?: string }> = ({
  name,
  price,
  description,
}) => (
  <li className="py-3">
    <div className="flex items-baseline gap-3">
      <span className="font-serif text-base md:text-lg text-brand-900 shrink-0">
        {name}
      </span>
      <span
        aria-hidden
        className="flex-1 border-b border-dotted border-brand-900/25 translate-y-[-4px] min-w-[24px]"
      />
      <span className="font-mono tabular-nums text-base md:text-lg text-brand-900 shrink-0">
        {price}
      </span>
    </div>
    {description && (
      <p className="mt-1 text-sm text-brand-700/70 leading-snug max-w-[34ch]">
        {description}
      </p>
    )}
  </li>
);

export const MenuCard: React.FC = () => {
  return (
    <section
      id="menu"
      className="relative bg-brand-beige py-24 md:py-32 scroll-mt-20"
    >
      <div className="container mx-auto px-6 lg:px-12">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-14 md:mb-20 max-w-3xl"
        >
          <p className="font-mono text-xs tracking-[0.25em] uppercase text-brand-700/60 mb-4">
            Karta
          </p>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-brand-900 tracking-tight leading-tight">
            Co serwujemy
          </h2>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10 lg:gap-16"
        >
          {CAFE_MENU.map((category) => (
            <div key={category.category}>
              <h3 className="font-serif italic text-xl md:text-2xl text-brand-900 mb-4">
                {category.category}
              </h3>
              <div className="h-px bg-brand-300 mb-2" />
              <ul className="divide-y divide-brand-900/10">
                {category.items.map((item) => (
                  <MenuRow
                    key={item.name}
                    name={item.name}
                    price={formatPrice(item.price)}
                    description={
                      item.description && item.description !== "Oryginalne"
                        ? item.description
                        : undefined
                    }
                  />
                ))}
              </ul>
              <p className="mt-3 font-mono text-xs text-brand-700/50 tabular-nums">
                ceny w zł
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default MenuCard;
```

- [ ] **Step 2: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/Cafe/MenuCard.tsx
git commit -m "feat(web): add MenuCard — printed-card menu, all categories visible, dotted leaders"
```

---

## Task 3: Create Inside component

**Files:**
- Create: `apps/web/src/components/Cafe/Inside.tsx`

- [ ] **Step 1: Write the component**

Asymmetric grid: large left photo (`kawiarnia.jpg`), two stacked photos on the right (`about-bakery.png`, `about-deli.png`). Mobile stacks all three vertically with the main one first.

Create `apps/web/src/components/Cafe/Inside.tsx`:

```tsx
"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const Inside: React.FC = () => {
  return (
    <section className="relative bg-brand-beige pb-24 md:pb-32">
      <div className="container mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
        >
          <div className="md:col-span-2 relative aspect-[4/3] md:aspect-[16/11] overflow-hidden bg-brand-900/5">
            <Image
              src="/assets/kawiarnia.jpg"
              alt="Wnętrze kawiarni Il Buon Caffe"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 66vw"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-6">
            <div className="relative aspect-[4/3] md:aspect-[5/4] overflow-hidden bg-brand-900/5">
              <Image
                src="/assets/about-bakery.png"
                alt="Świeże wypieki w Il Buon Caffe"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>
            <div className="relative aspect-[4/3] md:aspect-[5/4] overflow-hidden bg-brand-900/5">
              <Image
                src="/assets/about-deli.png"
                alt="Włoskie delikatesy w Il Buon Caffe"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
          className="mt-6 md:mt-8 max-w-xl text-base md:text-lg text-brand-700 leading-relaxed font-serif italic"
        >
          Lokal działa od 2003 roku. Espresso, świeże wypieki, włoskie delikatesy — kupisz wszystko na miejscu.
        </motion.p>
      </div>
    </section>
  );
};

export default Inside;
```

- [ ] **Step 2: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/Cafe/Inside.tsx
git commit -m "feat(web): add Inside — asymmetric photo collage with one-line caption"
```

---

## Task 4: Refactor Location.tsx into Visit

**Files:**
- Modify: `apps/web/src/components/Cafe/Location.tsx`

- [ ] **Step 1: Replace the file contents**

Lighter map filter, two-column layout (map left, info right on desktop), no `bg-brand-950` page-section background. Component renamed to `Visit` (file kept).

Overwrite `apps/web/src/components/Cafe/Location.tsx`:

```tsx
"use client";

import React from "react";
import { motion } from "motion/react";
import { Clock, MapPin, Phone, Instagram, Facebook, Navigation, Mail } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const HOURS = [
  { label: "Poniedziałek – Piątek", value: "09:00 – 16:00" },
  { label: "Sobota", value: "11:00 – 14:00" },
  { label: "Niedziela", value: "Zamknięte" },
];

export const Visit: React.FC = () => {
  return (
    <section
      id="location"
      className="relative bg-brand-beige py-24 md:py-32 scroll-mt-40 md:scroll-mt-48"
    >
      <div className="container mx-auto px-6 lg:px-12">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-12 md:mb-16 max-w-3xl"
        >
          <p className="font-mono text-xs tracking-[0.25em] uppercase text-brand-700/60 mb-4">
            Odwiedź nas
          </p>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-brand-900 tracking-tight leading-tight">
            Gdzie nas znajdziesz
          </h2>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: EASE }}
            className="relative lg:col-span-3 aspect-[4/3] lg:aspect-auto lg:min-h-[460px] overflow-hidden bg-brand-900/5"
          >
            <iframe
              title="Mapa Il Buon Caffe — Koszalin"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2334.5129280751567!2d16.178687613014777!3d54.18870151124879!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4701cd19ce8013ef%3A0x217844af23dcbb8a!2sKawiarnia%20%26%20Delikatesy%20Il%20Boun%20Caffe!5e0!3m2!1spl!2spl!4v1774121913838!5m2!1spl!2spl"
              width="100%"
              height="100%"
              style={{ border: 0, filter: "grayscale(0.6) contrast(1.05) brightness(0.95)" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 w-full h-full"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="lg:col-span-2 flex flex-col gap-8"
          >
            <div>
              <div className="flex items-start gap-3 mb-2">
                <MapPin className="w-5 h-5 text-brand-300 mt-1 shrink-0" aria-hidden />
                <p className="font-serif text-xl md:text-2xl text-brand-900 leading-snug">
                  ul. Biskupa Czesława Domina 3/6<br />
                  75-065 Koszalin
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-5 h-5 text-brand-300 shrink-0" aria-hidden />
                <p className="font-mono text-xs tracking-[0.2em] uppercase text-brand-700/60">
                  Godziny otwarcia
                </p>
              </div>
              <ul className="divide-y divide-brand-900/10 border-y border-brand-900/10">
                {HOURS.map((row) => (
                  <li
                    key={row.label}
                    className="flex items-baseline justify-between gap-4 py-3"
                  >
                    <span className="text-brand-900 text-sm md:text-base">{row.label}</span>
                    <span className="font-mono tabular-nums text-brand-900 text-sm md:text-base">
                      {row.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3 text-sm md:text-base">
              <a
                href="tel:+48664937937"
                className="flex items-center gap-3 text-brand-900 hover:text-brand-700 transition-colors"
              >
                <Phone className="w-4 h-4 text-brand-300 shrink-0" aria-hidden />
                <span className="font-mono tabular-nums">+48 664 937 937</span>
              </a>
              <a
                href="mailto:kontakt@ilbuoncaffe.pl"
                className="flex items-center gap-3 text-brand-900 hover:text-brand-700 transition-colors"
              >
                <Mail className="w-4 h-4 text-brand-300 shrink-0" aria-hidden />
                <span>kontakt@ilbuoncaffe.pl</span>
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=Il+Buon+Caffe+Koszalin"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-brand-900 text-brand-beige px-5 py-3 text-sm font-medium tracking-wide hover:bg-brand-700 transition-colors"
              >
                <Navigation className="w-4 h-4" aria-hidden />
                Wyznacz trasę
              </a>
              <div className="flex items-center gap-3 ml-auto lg:ml-0">
                <a
                  href="https://www.instagram.com/il_buoncaffe/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-brand-700 hover:text-brand-300 transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="https://www.facebook.com/IlBuonCaffeKoszalin"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="text-brand-700 hover:text-brand-300 transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Visit;
```

- [ ] **Step 2: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: PASS — note `Location` no longer exported, but `CafeClient` will be updated in Task 5 in the same uncommitted state, so don't be alarmed if a transient error appears. If running standalone, expect: `Module '"./Location"' has no exported member 'Location'` originating from `CafeClient.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/Cafe/Location.tsx
git commit -m "refactor(web): replace Location with Visit — lighter map, clean info card"
```

---

## Task 5: Rewrite CafeClient to orchestrate new sections

**Files:**
- Modify: `apps/web/src/components/Cafe/CafeClient.tsx`

- [ ] **Step 1: Replace the file contents**

Removes all imports of deprecated components, renders the 5 new sections, adds the closing italic sign-off line.

Overwrite `apps/web/src/components/Cafe/CafeClient.tsx`:

```tsx
"use client";

import React from "react";
import { motion } from "motion/react";
import { CafeHero } from "./CafeHero";
import { MenuCard } from "./MenuCard";
import { Inside } from "./Inside";
import { Visit } from "./Location";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const CafeClient: React.FC = () => {
  return (
    <div className="bg-brand-beige min-h-screen">
      <CafeHero />
      <MenuCard />
      <Inside />
      <Visit />

      <section className="bg-brand-beige pb-24 md:pb-32">
        <div className="container mx-auto px-6 lg:px-12">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: EASE }}
            className="text-center font-serif italic text-base md:text-lg text-brand-700/70 max-w-xl mx-auto leading-relaxed"
          >
            „Najlepsza kawa to ta, którą pijesz nie spiesząc się."
          </motion.p>
        </div>
      </section>
    </div>
  );
};

export default CafeClient;
```

- [ ] **Step 2: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/Cafe/CafeClient.tsx
git commit -m "refactor(web): rewrite CafeClient to orchestrate new 5-section layout"
```

---

## Task 6: Delete deprecated components

**Files:**
- Delete: `apps/web/src/components/Cafe/ScrollRevealSentence.tsx`
- Delete: `apps/web/src/components/Cafe/DayTimeline.tsx`
- Delete: `apps/web/src/components/Cafe/Ritual.tsx`
- Delete: `apps/web/src/components/Cafe/TastingMenu.tsx`
- Delete: `apps/web/src/components/Cafe/CafeHeroButtons.tsx`

- [ ] **Step 1: Verify no other files import them**

Run: `grep -rn -E "ScrollRevealSentence|DayTimeline|Ritual|TastingMenu|CafeHeroButtons" apps/web/src/ --include='*.tsx' --include='*.ts'`

Expected: only the deprecated files themselves appear (each file may import the others). No imports from any other file in `apps/web/src/`. If any unrelated file references them, stop and add a removal step before deleting.

Also re-check `apps/web/src/components/Cafe/CafeClient.tsx` (after Task 5): should reference only `CafeHero`, `MenuCard`, `Inside`, `Visit`. If it still references any deprecated component, Task 5 was applied incorrectly — fix Task 5 before continuing.

- [ ] **Step 2: Delete files**

```bash
rm apps/web/src/components/Cafe/ScrollRevealSentence.tsx
rm apps/web/src/components/Cafe/DayTimeline.tsx
rm apps/web/src/components/Cafe/Ritual.tsx
rm apps/web/src/components/Cafe/TastingMenu.tsx
rm apps/web/src/components/Cafe/CafeHeroButtons.tsx
```

- [ ] **Step 3: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A apps/web/src/components/Cafe/
git commit -m "chore(web): remove deprecated kawiarnia components"
```

---

## Task 7: Visual QA in browser

**Files:** none modified — verification only.

- [ ] **Step 1: Start the dev server**

Run: `turbo dev --filter=web`

Wait for `Ready` log line, then open `http://localhost:3000/kawiarnia`.

- [ ] **Step 2: Desktop QA (1280px or wider)**

Check each:
- Hero: photo loads, eyebrow `KOSZALIN · OD 2003` visible bottom-left, h1 `Il Buon Caffe` left-aligned, hours/phone in footer info row
- Menu: three columns visible at once, dotted leaders connect name→price, italic category names with brand-300 hairline, no tabs widget
- Inside: large photo on left, two smaller stacked on right
- Visit: map on left (lighter than before, still readable), info card on right with hours table, address, phone/email, `Wyznacz trasę` button, IG/FB icons
- Sign-off: single italic Polish-quoted line, centered, at the very bottom

- [ ] **Step 3: Tablet QA (768px)**

Resize browser to ~768px wide. Verify:
- Menu collapses to acceptable layout (still 3 columns at md breakpoint)
- Inside collage: large image full width, two smaller side-by-side below
- Visit: map and info card stack (lg breakpoint = 1024px, so they stack at 768)

- [ ] **Step 4: Mobile QA (375px)**

Open dev tools, set viewport to iPhone SE / 375px:
- Hero: text remains bottom-left, no horizontal overflow, info row wraps cleanly
- Menu: single column, all 3 categories listed top-to-bottom
- Inside: all 3 photos stacked vertically, main first
- Visit: map then info card stacked, button + social icons wrap as needed

- [ ] **Step 5: Smoke-check no regressions on other pages**

Visit `/`, `/sklep`, `/encyklopedia`, `/account`. Each should render without errors. (We only deleted Cafe-namespaced components but worth confirming.)

- [ ] **Step 6: No console errors or 404s**

Open browser dev tools → Console + Network tabs while reloading `/kawiarnia`. Confirm:
- No red console errors
- All three images (`kawiarnia.jpg`, `about-bakery.png`, `about-deli.png`) return 200
- The Google Maps iframe loads

- [ ] **Step 7: Lint**

Run: `turbo lint --filter=web`
Expected: PASS.

- [ ] **Step 8: Final commit (if anything was tweaked during QA)**

If you adjusted spacing, sizes, or copy during QA, commit:

```bash
git add -A
git commit -m "fix(web): post-QA polish on kawiarnia layout"
```

If nothing changed, skip this step.

---

## Acceptance (from spec)

1. ✅ Page renders 5 sections: hero (single image, bottom-left text), menu card (all items visible, no tabs), inside collage (3 real photos), visit (map + info card), one closing italic line
2. ✅ No `ScrollRevealSentence`, `DayTimeline`, `Ritual`, `TastingMenu`, `CafeHeroButtons` files or imports remain
3. ✅ No multi-layer gradient overlays, no blur-filter animations, no handwriting font on this page
4. ✅ Existing `CAFE_MENU` data renders under new `MenuCard` layout
5. ✅ Mobile (375px), tablet (768px), desktop (1280px) all verified in Task 7
