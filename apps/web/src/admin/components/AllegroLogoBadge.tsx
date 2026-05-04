'use client'

import Image from 'next/image'

type AllegroLogoBadgeProps = {
  size?: 'sm' | 'md'
  className?: string
}

export function AllegroLogoBadge({ size = 'sm', className = '' }: AllegroLogoBadgeProps) {
  const imageClass = size === 'md' ? 'h-[14px]' : 'h-[11px]'

  return (
    <span
      className={`inline-flex h-5 shrink-0 items-center justify-center rounded-full bg-[#FF5A00]/10 px-1.5 align-middle ${className}`}
      title="Allegro"
      aria-label="Allegro"
    >
      <Image
        src="/assets/allegro-logo.png"
        alt=""
        aria-hidden="true"
        width={180}
        height={60}
        className={`${imageClass} w-auto object-contain`}
        draggable={false}
      />
    </span>
  )
}
