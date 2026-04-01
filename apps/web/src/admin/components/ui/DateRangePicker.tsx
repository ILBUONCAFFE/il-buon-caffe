'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface DateRangePickerProps {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}

const MONTHS_PL = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]
const DAYS_PL = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd']

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay()
  return (d + 6) % 7 // Mon=0 … Sun=6
}

function fmtDisplay(s: string): string {
  const [y, m, d] = s.split('-')
  return `${d}.${m}.${y}`
}

function formatTrigger(from: string, to: string): string {
  if (!from && !to) return 'Zakres dat'
  if (from && !to) return `Od ${fmtDisplay(from)}`
  if (!from && to) return `Do ${fmtDisplay(to)}`
  return `${fmtDisplay(from)} – ${fmtDisplay(to)}`
}

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const [selecting, setSelecting] = useState<'start' | 'end'>('start')
  const [draftFrom, setDraftFrom] = useState(from)
  const [draftTo, setDraftTo] = useState(to)

  const today = new Date()
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setDraftFrom(from)
      setDraftTo(to)
      setSelecting('start')
      setHovered(null)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleDayClick = (dateStr: string) => {
    if (selecting === 'start') {
      setDraftFrom(dateStr)
      setDraftTo('')
      setSelecting('end')
    } else {
      const newFrom = dateStr < draftFrom ? dateStr : draftFrom
      const newTo = dateStr < draftFrom ? draftFrom : dateStr
      setDraftFrom(newFrom)
      setDraftTo(newTo)
      setSelecting('start')
      onChange(newFrom, newTo)
      setOpen(false)
    }
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // Compute the effective visible range (including hover preview)
  const previewEnd = selecting === 'end' && hovered ? hovered : draftTo
  const rangeA = draftFrom && previewEnd
    ? (draftFrom <= previewEnd ? draftFrom : previewEnd)
    : draftFrom
  const rangeB = draftFrom && previewEnd
    ? (draftFrom <= previewEnd ? previewEnd : draftFrom)
    : previewEnd

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const hasValue = from || to

  return (
    <div className="relative shrink-0" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`admin-input flex items-center gap-2 cursor-pointer select-none min-w-[188px] ${open ? 'ring-2 ring-[#1A1A1A]/10' : ''}`}
      >
        <Calendar size={14} className={hasValue ? 'text-[#0066CC] shrink-0' : 'text-[#A3A3A3] shrink-0'} />
        <span className={`text-sm flex-1 text-left ${hasValue ? 'text-[#1A1A1A]' : 'text-[#A3A3A3]'}`}>
          {formatTrigger(from, to)}
        </span>
        {hasValue && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onChange('', '') }}
            className="text-[#C0BFBC] hover:text-[#1A1A1A] transition-colors ml-0.5 shrink-0"
          >
            <X size={12} />
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl border border-[#E5E4E1] shadow-2xl shadow-black/8 p-5 w-[290px] animate-in fade-in zoom-in-95 duration-150 origin-top-right">

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F4F1] text-[#737373] hover:text-[#1A1A1A] transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[13px] font-semibold text-[#1A1A1A] tracking-tight">
              {MONTHS_PL[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F4F1] text-[#737373] hover:text-[#1A1A1A] transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_PL.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-[#C0BFBC] py-1 tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e${i}`} className="h-9" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = toDateStr(viewYear, viewMonth, day)
              const isStart = dateStr === rangeA && !!rangeB && rangeA !== rangeB
              const isEnd = dateStr === rangeB && !!rangeA && rangeA !== rangeB
              const isSingle = dateStr === rangeA && (!rangeB || rangeA === rangeB)
              const inRange = !!rangeA && !!rangeB && dateStr > rangeA && dateStr < rangeB
              const isToday = dateStr === todayStr
              const isSelected = isSingle || isStart || isEnd

              // Preview hover state
              const isHoverPreview = selecting === 'end' && hovered && (
                (draftFrom <= hovered ? (dateStr > draftFrom && dateStr < hovered) : (dateStr > hovered && dateStr < draftFrom))
              )

              return (
                <div
                  key={day}
                  className="relative h-9 flex items-center justify-center"
                >
                  {/* Range fill band */}
                  {(inRange || isHoverPreview) && (
                    <div className="absolute inset-y-1 inset-x-0 bg-[#EEF4FF]" />
                  )}
                  {isStart && (
                    <div className="absolute inset-y-1 left-1/2 right-0 bg-[#EEF4FF]" />
                  )}
                  {isEnd && (
                    <div className="absolute inset-y-1 left-0 right-1/2 bg-[#EEF4FF]" />
                  )}
                  {/* Day button */}
                  <button
                    onClick={() => handleDayClick(dateStr)}
                    onMouseEnter={() => selecting === 'end' && setHovered(dateStr)}
                    onMouseLeave={() => setHovered(null)}
                    className={`
                      relative z-10 w-8 h-8 rounded-full text-[13px] font-medium transition-all duration-100
                      ${isSelected
                        ? 'bg-[#1A1A1A] text-white shadow-sm'
                        : isToday
                          ? 'text-[#0066CC] font-semibold hover:bg-[#F5F4F1]'
                          : 'text-[#1A1A1A] hover:bg-[#F0F0EF]'
                      }
                    `}
                  >
                    {day}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-[#F5F4F1] flex items-center justify-between">
            <span className="text-[11px] text-[#A3A3A3]">
              {selecting === 'start' ? 'Wybierz datę początkową' : 'Wybierz datę końcową'}
            </span>
            {(draftFrom || draftTo) && (
              <button
                onClick={() => { setDraftFrom(''); setDraftTo(''); setSelecting('start'); onChange('', ''); setOpen(false) }}
                className="text-[11px] text-[#A3A3A3] hover:text-[#1A1A1A] transition-colors font-medium"
              >
                Wyczyść
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
