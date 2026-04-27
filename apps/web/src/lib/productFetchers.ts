import { cache } from 'react';
import {
  getProductBySlug as _getProductBySlug,
  getProductBySku as _getProductBySku,
} from '@/actions/products';

// React cache() deduplicates within a single request — generateMetadata and the
// page component share the same Promise instead of hitting Neon twice.
export const getProductBySlug = cache(_getProductBySlug);
export const getProductBySku = cache(_getProductBySku);
