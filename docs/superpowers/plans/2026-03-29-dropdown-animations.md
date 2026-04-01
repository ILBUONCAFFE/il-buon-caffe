# Dropdown Animations & Selection Fill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `Dropdown` component with Framer Motion enter/exit animations, press feedback on trigger, and filled-highlight for selected item.

**Architecture:** Single file edit — `Dropdown.tsx`. Replace conditional render with `AnimatePresence` + `motion.div` for panel, wrap trigger in `motion.button` with `whileTap`, update item classNames for selection fill.

**Tech Stack:** `motion/react` v12 (`motion`, `AnimatePresence`), Tailwind CSS 4

---

### Task 1: Rewrite Dropdown component

**Files:**
- Modify: `apps/web/src/admin/components/ui/Dropdown.tsx`

- [ ] **Step 1: Replace component with animated version**

Full replacement of `apps/web/src/admin/components/ui/Dropdown.tsx`:

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, Check } from 'lucide-react'

type DropdownProps = {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
  label: string
}

export const Dropdown = ({ options, value, onChange, label }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(opt => opt.value === value)
  const isNonDefault = value !== options[0]?.value

  return (
    <div ref={dropdownRef} className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.1 }}
        className={`btn-secondary gap-1.5 transition-colors ${isNonDefault ? 'bg-[#F0F0ED] border-[#D5D4D1]' : ''}`}
      >
        <span className="text-[#525252]">
          {label}: <span className="font-medium text-[#1A1A1A]">{selectedOption?.label}</span>
        </span>
        <ChevronDown
          size={14}
          className={`text-[#A3A3A3] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{
              duration: isOpen ? 0.15 : 0.12,
              ease: isOpen ? 'easeOut' : 'easeIn',
            }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 top-full mt-2 w-56 bg-white/90 backdrop-blur-xl rounded-xl shadow-2xl border border-[#E5E4E1] overflow-hidden z-50"
          >
            <div className="py-1.5">
              {options.map((option) => {
                const isSelected = value === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => { onChange(option.value); setIsOpen(false) }}
                    className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors text-[#1A1A1A] ${
                      isSelected
                        ? 'bg-[#F0F0ED] font-medium hover:bg-[#EAEAE7]'
                        : 'hover:bg-[#F5F4F1]'
                    }`}
                  >
                    <span>{option.label}</span>
                    {isSelected && <Check size={16} className="text-[#0066CC]" />}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Verify no type errors**

```bash
cd "C:/Users/User/Documents/1PROJEKTY/Il Buon Caffe" && npx turbo type-check --filter=web
```

Expected: no errors related to `Dropdown.tsx`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/admin/components/ui/Dropdown.tsx
git commit -m "feat(web): animate admin Dropdown with motion/react, add selection fill"
```
