'use client'

import { useState, useRef, useEffect } from 'react'
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

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E5E4E1] hover:border-[#D4D3D0] transition-colors text-sm"
      >
        <span className="text-[#525252]">
          {label}: <span className="font-semibold text-[#1A1A1A]">{selectedOption?.label}</span>
        </span>
        <ChevronDown size={16} className={`text-[#A3A3A3] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="py-2">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => { onChange(option.value); setIsOpen(false) }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-[#0066CC] transition-colors text-[#1A1A1A]"
              >
                <span>{option.label}</span>
                {value === option.value && <Check size={16} className="text-[#0066CC]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
