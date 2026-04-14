'use client';

import { Search, Command } from 'lucide-react';

interface SearchButtonProps {
  onOpen: () => void;
}

export function SearchButton({ onOpen }: SearchButtonProps) {
  return (
    <>
      {/* Full search bar — desktop only */}
      <button
        type="button"
        onClick={onOpen}
        aria-label="Szukaj w panelu"
        className="hidden md:flex group items-center gap-3 min-w-[220px] px-4 py-2.5 rounded-xl bg-[#F5F4F1] border border-transparent text-[#A3A3A3] text-sm hover:bg-white hover:border-[#E5E4E1] hover:shadow-sm hover:-translate-y-[0.5px] active:translate-y-0 active:shadow-none focus-visible:ring-2 focus-visible:ring-[#0066CC]/20 focus-visible:outline-none transition-all duration-200 ease-[cubic-bezier(0.25,1,0.5,1)]"
      >
        <Search
          size={16}
          className="text-[#A3A3A3] group-hover:text-[#0066CC] transition-colors duration-150"
        />
        <span className="text-sm text-[#A3A3A3]">Szukaj w panelu...</span>
        <kbd className="ml-auto flex items-center gap-0.5 bg-white/80 backdrop-blur-sm border border-[#E5E4E1] px-1.5 py-0.5 rounded-md text-[10px] font-medium text-[#A3A3A3]">
          <Command size={10} />
          K
        </kbd>
      </button>

      {/* Icon-only — mobile */}
      <button
        type="button"
        onClick={onOpen}
        aria-label="Szukaj w panelu"
        className="md:hidden p-2.5 rounded-xl bg-[#F5F4F1] border border-transparent hover:bg-white hover:border-[#E5E4E1] hover:shadow-sm transition-all duration-200"
      >
        <Search size={20} className="text-[#525252]" />
      </button>
    </>
  );
}
