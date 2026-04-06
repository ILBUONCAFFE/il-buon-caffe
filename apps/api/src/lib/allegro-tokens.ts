import { createDb, setHttpMode } from '@repo/db/client'
import { getAllegroApiBase, KV_KEYS, type AllegroEnvironment } from './allegro'
import { resolveAccessToken } from './allegro-orders/resolve-token'
import type { Env } from '../index'

export interface ActiveAllegroToken {
  accessToken: string
  apiBase: string
}

export async function getActiveAllegroToken(env: Env): Promise<ActiveAllegroToken | null> {
  if (!env.ALLEGRO_KV) return null

  // Token resolution uses a short HTTP DB read path to avoid opening WS pool.
  setHttpMode(true, env.DATABASE_URL)
  const db = createDb(env.DATABASE_URL)

  const accessToken = await resolveAccessToken(env.ALLEGRO_KV, db, env)
  if (!accessToken) return null

  const environment = ((await env.ALLEGRO_KV.get(KV_KEYS.ENVIRONMENT)) ?? env.ALLEGRO_ENVIRONMENT ?? 'sandbox') as AllegroEnvironment
  const apiBase = getAllegroApiBase(environment)

  return { accessToken, apiBase }
}
