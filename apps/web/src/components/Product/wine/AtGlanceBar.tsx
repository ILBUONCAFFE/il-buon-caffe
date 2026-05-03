"use client";

import React from 'react';
import { CountryFlag } from './CountryFlag';
import type { PaletteType } from './palette';
import type { WineDetails } from '@/content/products/wineData';

interface AtGlanceBarProps {
  wineDetails: WineDetails;
  palette: PaletteType;
  origin?: string;
}

interface GlanceItem {
  label: string;
  value: string;
  customVisual?: React.ReactNode;
}

export const AtGlanceBar = ({ wineDetails, palette, origin }: AtGlanceBarProps) => {
  const items: GlanceItem[] = [];

  if (origin) {
    items.push({
      label: 'Pochodzenie',
      value: origin,
      customVisual: wineDetails.countryCode 
        ? <CountryFlag countryCode={wineDetails.countryCode} size={16} className="rounded-sm" /> 
        : null
    });
  }

  if (wineDetails.grape && wineDetails.grape !== '—') {
    items.push({
      label: 'Szczep',
      value: wineDetails.grape,
    });
  }

  if (wineDetails.alcohol && wineDetails.alcohol !== '—') {
    items.push({
      label: 'Alkohol',
      value: wineDetails.alcohol,
    });
  }

  if (wineDetails.capacity) {
    items.push({
      label: 'Pojemność',
      value: wineDetails.capacity,
    });
  }

  if (wineDetails.winery && wineDetails.winery !== '—') {
    items.push({
      label: 'Producent',
      value: wineDetails.winery,
    });
  }

  if (items.length === 0) return null;

  return (
    <div
      className="sticky top-[64px] z-20 backdrop-blur-md border-y hidden lg:block"
      style={{
        backgroundColor: 'rgba(253, 250, 246, 0.85)',
        borderColor: palette.borderLight,
      }}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-16 2xl:px-20">
        <div className="flex items-stretch justify-center">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex-1 max-w-[240px] flex items-center justify-center gap-3 px-6 py-5"
              style={{
                borderLeft: idx > 0 ? `1px solid ${palette.borderLight}` : 'none',
              }}
            >
              <div className="flex flex-col text-center leading-tight">
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-1" style={{ color: palette.textDim }}>
                  {item.label}
                </span>
                <div className="flex items-center justify-center gap-2">
                  {item.customVisual}
                  <span className="text-sm font-medium" style={{ color: palette.text }}>
                    {item.value}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AtGlanceGrid = ({ wineDetails, palette, origin }: AtGlanceBarProps) => {
  const items: GlanceItem[] = [];

  if (origin) {
    items.push({
      label: 'Pochodzenie',
      value: origin,
      customVisual: wineDetails.countryCode 
        ? <CountryFlag countryCode={wineDetails.countryCode} size={14} className="rounded-sm" /> 
        : null
    });
  }
  if (wineDetails.grape && wineDetails.grape !== '—') items.push({ label: 'Szczep', value: wineDetails.grape });
  if (wineDetails.alcohol && wineDetails.alcohol !== '—') items.push({ label: 'Alkohol', value: wineDetails.alcohol });
  if (wineDetails.capacity) items.push({ label: 'Pojemność', value: wineDetails.capacity });
  if (wineDetails.winery && wineDetails.winery !== '—') items.push({ label: 'Producent', value: wineDetails.winery });

  if (items.length === 0) return null;

  const isOddLast = items.length % 2 === 1;

  return (
    <div className="lg:hidden border-y" style={{ borderColor: palette.borderLight, backgroundColor: palette.bgWarm }}>
      <div className="grid grid-cols-2">
        {items.map((item, idx) => {
          const isLastOdd = isOddLast && idx === items.length - 1;
          const onLeft = idx % 2 === 0;
          const onTopRow = idx < 2;
          return (
            <div
              key={idx}
              className={`flex flex-col items-center justify-center text-center px-4 py-4 min-w-0 ${isLastOdd ? 'col-span-2' : ''}`}
              style={{
                borderLeft: !isLastOdd && !onLeft ? `1px solid ${palette.borderLight}` : 'none',
                borderTop: !onTopRow ? `1px solid ${palette.borderLight}` : 'none',
              }}
            >
              <span className="text-[9px] uppercase tracking-[0.22em] font-semibold mb-1.5" style={{ color: palette.textDim }}>
                {item.label}
              </span>
              <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                {item.customVisual}
                <span className="text-[13px] font-medium truncate" style={{ color: palette.text }}>
                  {item.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
