/**
 * IndexNow — Bing URL submission utility
 *
 * Notifies Bing (and other IndexNow-compatible search engines) when product
 * URLs are created, updated, or removed.  Failures are intentionally swallowed
 * so they never affect the primary API response.
 *
 * Docs: https://www.indexnow.org/documentation
 */

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
const SITE_HOST = 'ilbuoncaffe.pl'

/**
 * Submits one or more URLs to IndexNow.
 * Fire-and-forget — always resolves, never throws.
 *
 * @param urls     Absolute URLs to submit (https://...)
 * @param apiKey   IndexNow API key (stored as INDEXNOW_KEY secret)
 */
export async function notifyIndexNow(urls: string[], apiKey: string | undefined): Promise<void> {
  if (!apiKey || urls.length === 0) return

  const body = {
    host:    SITE_HOST,
    key:     apiKey,
    keyLocation: `https://${SITE_HOST}/${apiKey}.txt`,
    urlList: urls,
  }

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body:    JSON.stringify(body),
    })

    if (!res.ok && res.status !== 202) {
      // 200 and 202 are both success codes for IndexNow
      console.warn(`[IndexNow] Unexpected response: ${res.status} for ${urls.join(', ')}`)
    } else {
      console.log(`[IndexNow] Submitted ${urls.length} URL(s): ${urls.join(', ')}`)
    }
  } catch (err) {
    // Network errors must not affect the caller — always silent
    console.warn('[IndexNow] Submission failed (network):', err instanceof Error ? err.message : String(err))
  }
}

/**
 * Builds absolute product URL from a slug.
 */
export function productUrl(slug: string): string {
  return `https://${SITE_HOST}/sklep/${slug}`
}
