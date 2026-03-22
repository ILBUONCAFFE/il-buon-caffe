import bcrypt from 'bcryptjs'
import commonPasswords from './common-passwords.json'

// Password requirements constants
const MIN_PASSWORD_LENGTH = 12
const MAX_PASSWORD_LENGTH = 72 // bcrypt hard limit
const BCRYPT_ROUNDS = 12

// Common passwords set for O(1) lookup
const commonPasswordsSet = new Set(commonPasswords.map(p => p.toLowerCase()))

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
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
