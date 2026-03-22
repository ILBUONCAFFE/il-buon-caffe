"use client";

import Image from 'next/image';
import { countryCodeToName } from './palette';
import { getFlagPath } from '@/content/products/wineData';

// Flag component — renders country flag from /assets/flags/
export const CountryFlag = ({ countryCode, size = 20, className = '' }: { countryCode: string; size?: number; className?: string }) => {
  const flagPath = getFlagPath(countryCode);
  if (!flagPath) return null;

  return (
    <Image
      src={flagPath}
      alt={`Flaga ${countryCodeToName[countryCode.toLowerCase()] ?? countryCode.toUpperCase()}`}
      width={size}
      height={Math.round(size * 0.67)}
      className={`inline-block rounded-sm object-cover ${className}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
      unoptimized
    />
  );
};
