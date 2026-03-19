import bcrypt from 'bcryptjs'
import commonPasswords from './common-passwords.json'

// Password requirements constants
const MIN_PASSWORD_LENGTH = 12
const MAX_PASSWORD_LENGTH = 128
const BCRYPT_ROUNDS = 12

// Common passwords set for O(1) lookup
const commonPasswordsSet = new Set(commonPasswords.map(p => p.toLowerCase()))

/**
 * Pre-hash the plaintext with SHA-256 before passing to bcrypt.
 *
 * Why: bcrypt silently truncates input at 72 bytes (~36 UTF-8 Polish chars).
 * Pre-hashing produces a fixed-length 64-char hex digest, eliminating the
 * truncation vulnerability while keeping full bcrypt security (cost factor,
 * unique salt, resistance to GPU attacks).
 *
 * Uses Web Crypto API (native in Cloudflare Workers).
 */
async function preHash(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Hash a password using SHA-256 prehash + bcrypt
 * @param password - Plain text password to hash
 * @returns Hashed password string
 */
export async function hashPassword(password: string): Promise<string> {
  const preHashed = await preHash(password)
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS)
  return bcrypt.hash(preHashed, salt)
}

/**
 * Verify a password against a hash using SHA-256 prehash + bcrypt
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns True if password matches hash, false otherwise
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const preHashed = await preHash(password)
  return bcrypt.compare(preHashed, hash)
}

/**
 * Password strength validation result
 */
export interface PasswordStrengthResult {
  isStrong: boolean
  errors: string[]
}

/**
 * Check if password meets security requirements:
 * - Minimum 12 characters
 * - Maximum 128 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 * - At least 1 special character
 * - Not in top 1000 most common passwords
 * - Not just repeated characters
 * 
 * @param password - Password to validate
 * @returns Object with isStrong boolean and array of error messages
 */
export function isPasswordStrong(password: string): PasswordStrengthResult {
  const errors: string[] = []
  
  // Check maximum length (prevent DoS via huge payloads before hashing)
  if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`Hasło może mieć maksymalnie ${MAX_PASSWORD_LENGTH} znaków`)
    return { isStrong: false, errors }
  }
  
  // Check minimum length
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków`)
  }
  
  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Hasło musi zawierać co najmniej 1 wielką literę')
  }
  
  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Hasło musi zawierać co najmniej 1 małą literę')
  }
  
  // Check for digit
  if (!/\d/.test(password)) {
    errors.push('Hasło musi zawierać co najmniej 1 cyfrę')
  }
  
  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    errors.push('Hasło musi zawierać co najmniej 1 znak specjalny (!@#$%^&*...)')
  }
  
  // Check against common passwords
  if (commonPasswordsSet.has(password.toLowerCase())) {
    errors.push('Hasło jest zbyt popularne i łatwe do odgadnięcia')
  }
  
  // Check for repeated characters (e.g., "AAAaaa111!!!")
  if (/^(.)\1+$/.test(password)) {
    errors.push('Hasło nie może składać się z powtarzających się znaków')
  }
  
  // Check for sequential patterns
  if (/^(012|123|234|345|456|567|678|789|abc|bcd|cde|def)/i.test(password)) {
    errors.push('Hasło nie może zaczynać się od sekwencji znaków')
  }
  
  return {
    isStrong: errors.length === 0,
    errors
  }
}

/**
 * Quick check if password is strong (convenience method)
 * @param password - Password to validate
 * @returns True if password meets all requirements
 */
export function isPasswordValid(password: string): boolean {
  return isPasswordStrong(password).isStrong
}
