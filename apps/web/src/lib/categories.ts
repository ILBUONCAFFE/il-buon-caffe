const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  coffee: 'kawa',
  alcohol: 'wino',
  wine: 'wino',
  wines: 'wino',
  sweets: 'slodycze',
  pantry: 'spizarnia',
  delicacies: 'spizarnia',
  kawa: 'kawa',
  wino: 'wino',
  slodycze: 'slodycze',
  spizarnia: 'spizarnia',
};

export const KNOWN_CATEGORY_SLUGS = new Set([
  ...Object.keys(CATEGORY_SLUG_ALIASES),
  ...Object.values(CATEGORY_SLUG_ALIASES),
]);

export function normalizeCategorySlug(category?: string | null): string {
  if (!category) return '';
  return CATEGORY_SLUG_ALIASES[category] || category;
}

export function isWineCategory(category?: string | null): boolean {
  return normalizeCategorySlug(category) === 'wino';
}

export function categoryFilterSlugs(category?: string | null): string[] {
  const normalized = normalizeCategorySlug(category);
  if (normalized === 'wino') return ['wino', 'wine', 'alcohol'];
  if (normalized === 'kawa') return ['kawa', 'coffee'];
  if (normalized === 'slodycze') return ['slodycze', 'sweets'];
  if (normalized === 'spizarnia') return ['spizarnia', 'pantry', 'delicacies'];
  return category ? [category] : [];
}
