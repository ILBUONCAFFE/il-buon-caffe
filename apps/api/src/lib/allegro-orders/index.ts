/**
 * Allegro Order Sync — Public API
 *
 * Re-exports the main functions used by the rest of the application.
 */

export { syncAllegroOrders } from './sync'
export { backfillAllegroOrders } from './backfill'
export type { BackfillResult } from './types'
