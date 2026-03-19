/**
 * Token hashing utility for secure storage in database
 * Uses Web Crypto API (available in Cloudflare Workers)
 */

/**
 * Hash a token using SHA-256 for secure database storage
 * @param token - Raw token to hash
 * @returns Hex-encoded hash
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a secure random token
 * @param length - Token length in bytes (will be hex encoded, so result is 2x length)
 * @returns Hex-encoded random token
 */
export function generateSecureToken(length: number = 32): string {
  const randomBytes = new Uint8Array(length)
  crypto.getRandomValues(randomBytes)
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Generate a UUID v4 using Web Crypto API
 */
export function generateUUID(): string {
  return crypto.randomUUID()
}
