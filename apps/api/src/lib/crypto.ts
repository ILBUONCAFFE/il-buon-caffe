/**
 * AES-256-GCM encryption / decryption (Web Crypto API — Cloudflare Workers native)
 * Used for encrypting Allegro tokens before storing in DB.
 *
 * Key: 32-byte hex string stored as CF secret ALLEGRO_TOKEN_ENCRYPTION_KEY.
 * If no key provided, stores tokens in plain text (development only).
 */

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function importKey(keyHex: string): Promise<CryptoKey> {
  const keyBytes = hexToBytes(keyHex)
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

/**
 * Encrypt plain text → hex string (iv prepended)
 */
export async function encryptText(text: string, keyHex: string): Promise<string> {
  const key = await importKey(keyHex)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(text)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(12 + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), 12)
  return bytesToHex(combined)
}

/**
 * Check if a string looks like AES-GCM hex ciphertext (min 12-byte IV = 24 hex chars)
 * JWT tokens and plain-text strings contain dots, dashes, underscores — never valid hex.
 */
function isHexCiphertext(text: string): boolean {
  return /^[0-9a-f]{48,}$/i.test(text)
}

/**
 * Decrypt hex string → plain text.
 * If the input is NOT hex ciphertext (e.g. a legacy unencrypted token),
 * returns it as-is to avoid crashing the sync Worker.
 */
export async function decryptText(hex: string, keyHex: string): Promise<string> {
  if (!isHexCiphertext(hex)) {
    console.warn('[Crypto] Token nie jest zaszyfrowany (plaintext) — zwracam bez zmian. Uruchom ponownie OAuth flow aby zaszyfrować.')
    return hex
  }
  const key = await importKey(keyHex)
  const combined = hexToBytes(hex)
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  return new TextDecoder().decode(decrypted)
}
