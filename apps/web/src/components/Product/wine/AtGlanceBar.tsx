"use client";

import React from 'react';
import { Globe, Grape, Wine, Droplet, Building2 } from 'lucide-react';
import { CountryFlag } from './CountryFlag';
import type { PaletteType } from './palette';
import type { WineDetails } from '@/content/products/wineData';

interface AtGlanceBarProps {
  wineDetails: WineDetails;
  palette: PaletteType;
  origin?: string;
}

interface GlanceItem {
  icon: React.ReactNode;
  label: string;
  value: string;
}

export const AtGlanceBar = ({ wineDetails, palette, origin }: AtGlanceBarProps) => {
  const items: GlanceItem[] = [];

  if (origin) {
    items.push({
      icon: wineDetails.countryCode
        ? <CountryFlag countryCode={wineDetails.countryCode} size={18} className="rounded-sm" />
        : <Globe size={16} style={{ color: palette.gold }} />,
      label: 'Pochodzenie',
      value: origin,
    });
  }

  if (wineDetails.grape && wineDetails.grape !== '—') {
    items.push({
      icon: <Grape size={16} style={{ color: palette.gold }} />,
      label: 'Szczep',
      value: wineDetails.grape,
    });
  }

  if (wineDetails.alcohol && wineDetails.alcohol !== '—') {
    items.push({
      icon: <Wine size={16} style={{ color: palette.gold }} />,
      label: 'Alkohol',
      value: wineDetails.alcohol,
    });
  }

  if (wineDetails.capacity) {
    items.push({
      icon: <Droplet size={16} style={{ color: palette.gold }} />,
      label: 'Pojemność',
      value: wineDetails.capacity,
    });
  }

  if (wineDetails.winery && wineDetails.winery !== '—') {
    items.push({
      icon: <Building2 size={16} style={{ color: palette.gold }} />,
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
        <div className="flex items-stretch">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex-1 min-w-0 flex items-center gap-3 px-6 py-4"
              style={{
                borderLeft: idx > 0 ? `1px solid ${palette.borderLight}` : 'none',
              }}
            >
              <div className="shrink-0 flex items-center justify-center h-8 w-8 rounded-full" style={{ backgroundColor: palette.bgMuted }}>
                {item.icon}
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: palette.textDim }}>
                  {item.label}
                </span>
                <span className="text-sm font-medium truncate" style={{ color: palette.text }}>
                  {item.value}
                </span>
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
      icon: wineDetails.countryCode
        ? <CountryFlag countryCode={wineDetails.countryCode} size={16} className="rounded-sm" />
        : <Globe size={14} style={{ color: palette.gold }} />,
      label: 'Pochodzenie',
      value: origin,
    });
  }
  if (wineDetails.grape && wineDetails.grape !== '—') items.push({ icon: <Grape size={14} style={{ color: palette.gold }} />, label: 'Szczep', value: wineDetails.grape });
  if (wineDetails.alcohol && wineDetails.alcohol !== '—') items.push({ icon: <Wine size={14} style={{ color: palette.gold }} />, label: 'Alkohol', value: wineDetails.alcohol });
  if (wineDetails.capacity) items.push({ icon: <Droplet size={14} style={{ color: palette.gold }} />, label: 'Pojemność', value: wineDetails.capacity });
  if (wineDetails.winery && wineDetails.winery !== '—') items.push({ icon: <Building2 size={14} style={{ color: palette.gold }} />, label: 'Producent', value: wineDetails.winery });

  if (items.length === 0) return null;

  return (
    <div className="lg:hidden border-y" style={{ borderColor: palette.borderLight, backgroundColor: palette.bgWarm }}>
      <div className="max-w-[1400px] mx-auto px-6 py-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2.5 min-w-0">
              <div className="shrink-0">{item.icon}</div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[9px] uppercase tracking-[0.16em] font-semibold" style={{ color: palette.textDim }}>
                  {item.label}
                </span>
                <span className="text-[13px] font-medium truncate" style={{ color: palette.text }}>
                  {item.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
