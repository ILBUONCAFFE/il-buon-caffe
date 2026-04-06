import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 10;
/**
 * With SHA-256 pre-hashing (below) the effective max length is removed —
 * SHA-256 accepts arbitrary length input and always produces a 64-char hex
 * digest that sits well within bcrypt’s 72-byte effective range.
 *
 * ⚠  MIGRATION NOTE: changing these functions changes the stored credential
 * format. All existing admin passwords must be reset once after deployment.
 * The ‘create-admin’ script should be re-run, or a password-reset flow used.
 */
const MAX_PASSWORD_LENGTH = 128; // generous limit; SHA-256 handles truncation internally

/**
 * Pre-hash the plaintext with SHA-256 before passing to bcrypt.
 *
 * Why: bcrypt silently truncates input at 72 bytes (= ~36 UTF-8 Polish chars).
 * Pre-hashing produces a fixed-length 64-char hex digest, eliminating the
 * truncation vulnerability while keeping full bcrypt security (cost factor,
 * unique salt, resistance to GPU attacks).
 *
 * The SHA-256 step is not a security layer on its own — it’s purely
 * a length-normalisation step before bcrypt.
 */
async function preHash(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(await preHash(password), SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const normalizedMatch = await bcrypt.compare(await preHash(password), hash);
  if (normalizedMatch) return true;

  // Backward compatibility: accept legacy hashes created before SHA-256 pre-hash migration.
  return bcrypt.compare(password, hash);
}

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Hasło musi mieć minimum ${MIN_PASSWORD_LENGTH} znaków`);
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`Hasło może mieć maksymalnie ${MAX_PASSWORD_LENGTH} znaków`);
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Hasło musi zawierać wielką literę');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Hasło musi zawierać małą literę');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Hasło musi zawierać cyfrę');
  }

  return { valid: errors.length === 0, errors };
}
