export const CATEGORY_CONTENT_CONFIG = {
  wine: {
    profileDimensions: ['body', 'sweetness', 'acidity', 'tannin'] as const,
    sensoryDimensions: ['eye', 'nose', 'palate'] as const,
    producerLabel: 'Winnica',
    producerSlug: 'winiarnie',
    ritualLabel: 'Serwowanie',
    alcoholField: true, // separate % field stored in extended.alcohol
  },
  coffee: {
    profileDimensions: ['acidity', 'body', 'sweetness', 'roast', 'bitterness'] as const,
    sensoryDimensions: ['aroma', 'taste', 'aftertaste'] as const,
    producerLabel: 'Plantacja',
    producerSlug: 'plantacje',
    ritualLabel: 'Parzenie',
  },
  delicacies: {
    profileDimensions: ['intensity', 'saltiness', 'sweetness', 'umami'] as const,
    sensoryDimensions: ['aroma', 'taste', 'texture'] as const,
    producerLabel: 'Producent',
    producerSlug: 'producenci',
    ritualLabel: 'Podanie',
  },
} as const

export type ProductCategory = keyof typeof CATEGORY_CONTENT_CONFIG
export type CategoryConfig = (typeof CATEGORY_CONTENT_CONFIG)[ProductCategory]
