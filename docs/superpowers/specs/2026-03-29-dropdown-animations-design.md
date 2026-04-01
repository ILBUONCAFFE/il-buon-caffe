# Dropdown Animations & Selection Fill — Design Spec

**Date:** 2026-03-29
**Scope:** `apps/web/src/admin/components/ui/Dropdown.tsx`
**Status:** Approved

---

## Goal

Upgrade the admin panel `Dropdown` component with subtle, elegant, minimalistic animations and intelligent selection fill — both on the item list and the trigger button.

---

## Approach

**C: Framer Motion for panel, CSS/Tailwind for item states.**

- `AnimatePresence` on the dropdown panel for smooth enter/exit
- `motion.button` on the trigger for press feedback
- Tailwind classes for item selection fill

---

## Animation Spec

### Panel (AnimatePresence + motion.div)

| Phase  | opacity | scale | y      | duration | easing  |
|--------|---------|-------|--------|----------|---------|
| Enter  | 0 → 1   | 0.95 → 1 | -4 → 0 | 150ms | easeOut |
| Exit   | 1 → 0   | 1 → 0.95 | 0 → -4 | 120ms | easeIn  |

- `transformOrigin: "top right"` — panel aligns right-0

### Trigger Button (motion.button)

- `whileTap={{ scale: 0.97 }}` — subtle press feel
- When selected value ≠ first/default option: `bg-[#F0F0ED] border-[#D5D4D1]`
- When open (isOpen): existing `rotate-180` on ChevronDown stays as-is

---

## Item Selection Fill

| State                        | Styles                                          |
|------------------------------|-------------------------------------------------|
| Default (unselected)         | `hover:bg-[#F5F4F1]` (unchanged)               |
| Selected                     | `bg-[#F0F0ED] font-medium` + ✓ icon            |
| Selected + hover             | `hover:bg-[#EAEAE7]`                            |

No accent colors — strictly neutral palette consistent with existing admin UI.

---

## Files Changed

| File | Change |
|------|--------|
| `apps/web/src/admin/components/ui/Dropdown.tsx` | Full rewrite of component using Framer Motion |

No new files. No new dependencies (Framer Motion already in project).

---

## Out of Scope

- Staggered item entrance animations (overkill for filter dropdowns)
- Keyboard navigation changes
- Other admin UI components
