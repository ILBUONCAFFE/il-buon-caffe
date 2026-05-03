"use client";

import React from 'react';
import type { GlassType } from '@/content/products/wineData';

interface GlassIconProps {
  type: GlassType;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const PATHS: Record<GlassType, string> = {
  bordeaux: 'M9 2 H15 L15 14 C15 17 13.5 19 12 19 C10.5 19 9 17 9 14 Z M12 19 V28 M8 28 H16',
  burgundy: 'M7 6 C7 4 9 2 12 2 C15 2 17 4 17 6 L16 14 C16 17 14 19 12 19 C10 19 8 17 8 14 Z M12 19 V28 M8 28 H16',
  white: 'M9 3 H15 L14.5 14 C14.5 17 13.3 18.5 12 18.5 C10.7 18.5 9.5 17 9.5 14 Z M12 18.5 V28 M8 28 H16',
  rose: 'M9 3 H15 L14.5 13 C14.5 16 13.3 17.5 12 17.5 C10.7 17.5 9.5 16 9.5 13 Z M12 17.5 V28 M8 28 H16',
  flute: 'M10.5 2 H13.5 L13 18 C13 19 12.5 19.5 12 19.5 C11.5 19.5 11 19 11 18 Z M12 19.5 V28 M9 28 H15',
  tulip: 'M10 4 C10 2.5 11 2 12 2 C13 2 14 2.5 14 4 L13.5 16 C13.5 18 12.8 19.5 12 19.5 C11.2 19.5 10.5 18 10.5 16 Z M12 19.5 V28 M9 28 H15',
  coupe: 'M6 5 C6 5 8 13 12 13 C16 13 18 5 18 5 Z M12 13 V28 M8 28 H16',
  iso: 'M9 4 H15 L14.2 13 C14.2 16 13.2 17.5 12 17.5 C10.8 17.5 9.8 16 9.8 13 Z M12 17.5 V28 M8 28 H16',
};

const LABELS: Record<GlassType, string> = {
  bordeaux: 'Bordeaux',
  burgundy: 'Burgund',
  white: 'Białe wino',
  rose: 'Różowe',
  flute: 'Flute',
  tulip: 'Tulipan',
  coupe: 'Coupe',
  iso: 'ISO',
};

export const GlassIcon = ({ type, size = 48, color = 'currentColor', strokeWidth = 1.4 }: GlassIconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 30"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[type]} />
    </svg>
  );
};

export const getGlassLabel = (type: GlassType): string => LABELS[type];
