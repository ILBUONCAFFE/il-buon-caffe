import type { Env } from '../index'
import { getActiveAllegroToken } from './allegro-tokens'

const ALLEGRO_CONTENT_TYPE = 'application/vnd.allegro.public.v1+json'

export type AllegroOfferSyncInput = {
  offerId: string
  price?: {
    amount: number | string
    currency?: string | null
  }
  stock?: number
}

export type AllegroOfferSyncResult = {
  offerId: string
  syncedPrice?: {
    amount: string
    currency: string
  }
  syncedStock?: number
}

function formatPriceAmount(value: number | string): string {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error('Nieprawidłowa cena do synchronizacji z Allegro')
  }
  return numeric.toFixed(2)
}

function normalizeStock(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Nieprawidłowy stan do synchronizacji z Allegro')
  }
  return Math.floor(value)
}

export async function patchAllegroOfferFields(
  env: Env,
  input: AllegroOfferSyncInput,
): Promise<AllegroOfferSyncResult> {
  const activeToken = await getActiveAllegroToken(env)
  if (!activeToken) {
    throw new Error('Allegro nie jest podłączone')
  }

  const body: Record<string, unknown> = {}
  const result: AllegroOfferSyncResult = { offerId: input.offerId }

  if (input.price !== undefined) {
    const amount = formatPriceAmount(input.price.amount)
    const currency = input.price.currency || 'PLN'
    body.sellingMode = { price: { amount, currency } }
    result.syncedPrice = { amount, currency }
  }

  if (input.stock !== undefined) {
    const available = normalizeStock(input.stock)
    body.stock = { available }
    result.syncedStock = available
  }

  if (Object.keys(body).length === 0) {
    return result
  }

  const response = await fetch(`${activeToken.apiBase}/sale/product-offers/${input.offerId}`, {
    method: 'PATCH',
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Bearer ${activeToken.accessToken}`,
      'Content-Type': ALLEGRO_CONTENT_TYPE,
      Accept: ALLEGRO_CONTENT_TYPE,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const responseBody = await response.text().catch(() => '')
    throw new Error(`Allegro zwróciło ${response.status}: ${responseBody}`)
  }

  return result
}
