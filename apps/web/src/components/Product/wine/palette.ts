export interface PaletteType {
  bg: string; bgWarm: string; bgCard: string; bgMuted: string;
  text: string; textSecondary: string; textMuted: string; textDim: string;
  accent: string; accentLight: string; accentSoft: string; accentSofter: string;
  gold: string; goldLight: string; border: string; borderLight: string;
  shadow: string; shadowHover: string;
}

// Design tokens — light only
export const palette: PaletteType = {
  bg: '#FDFAF6',
  bgWarm: '#F7F2EB',
  bgCard: '#FFFFFF',
  bgMuted: '#F0EBE3',
  text: '#1C1714',
  textSecondary: '#52483D',
  textMuted: '#8A7E72',
  textDim: '#B5AA9E',
  accent: '#7B2D3B',      // deep wine red
  accentLight: '#9E4A58',
  accentSoft: 'rgba(123, 45, 59, 0.08)',
  accentSofter: 'rgba(123, 45, 59, 0.04)',
  gold: '#A68B5B',
  goldLight: '#C4A97D',
  border: '#E8E0D6',
  borderLight: '#F0EBE4',
  shadow: '0 1px 3px rgba(28, 23, 20, 0.04), 0 8px 24px rgba(28, 23, 20, 0.06)',
  shadowHover: '0 2px 8px rgba(28, 23, 20, 0.06), 0 16px 40px rgba(28, 23, 20, 0.1)',
};

// Country code → Polish genitive name (for "Flaga X" grammar)
export const countryCodeToName: Record<string, string> = {
  es: 'Hiszpanii',
  it: 'Włoch',
  fr: 'Francji',
  pt: 'Portugalii',
  ar: 'Argentyny',
  cl: 'Chile',
  de: 'Niemiec',
  at: 'Austrii',
  au: 'Australii',
  nz: 'Nowej Zelandii',
  us: 'Stanów Zjednoczonych',
  za: 'Republiki Południowej Afryki',
  ge: 'Gruzji',
  gr: 'Grecji',
  hu: 'Węgier',
  ro: 'Rumunii',
  hr: 'Chorwacji',
  si: 'Słowenii',
  md: 'Mołdawii',
};
