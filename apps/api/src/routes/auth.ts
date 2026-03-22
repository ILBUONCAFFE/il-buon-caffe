import { Hono } from 'hono'
import { users, sessions, userConsents, passwordResetTokens, emailVerificationTokens, auditLog } from '@repo/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import type { Env } from '../index'

import { hashPassword, verifyPassword, isPasswordStrong } from '../lib/password'
import { generateTokenPair, verifyRefreshToken, TokenPayload, RefreshTokenPayload } from '../lib/jwt'
import { setAuthCookies, clearAuthCookies, getRefreshTokenFromCookie } from '../lib/cookies'
import { hashToken, generateSecureToken } from '../lib/token'
import { loginRateLimiter, registerRateLimiter, passwordResetRateLimiter, checkRateLimitByKey } from '../middleware/rateLimit'
import { requireAuth } from '../middleware/auth'
import { sanitize } from '../lib/sanitize'
import { errMsg } from '../lib/request'

const MAX_REQUEST_BODY_SIZE = 10_000 // 10 KB — generous for auth payloads

/**
 * Normalise e-mail: lowercase, trim, collapse whitespace.
 * Returns empty string for obviously invalid input so callers can just check truthiness.
 */
function normalizeEmail(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().toLowerCase().replace(/\s+/g, '')
}

// Types
interface RegisterBody {
  email: string
  password: string
  name?: string
  consents: {
    terms: boolean
    privacy: boolean
    marketing?: boolean
    analytics?: boolean
  }
}

interface LoginBody {
  email: string
  password: string
  rememberMe?: boolean
}

interface ResetPasswordRequestBody {
  email: string
}

interface ResetPasswordConfirmBody {
  token: string
  newPassword: string
}

interface VerifyEmailBody {
  token: string
}

interface ChangePasswordBody {
  currentPassword: string
  newPassword: string
}

// Constants
const TERMS_VERSION = '1.0'
const PRIVACY_VERSION = '1.0'
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 60 * 60 * 1000 // 1 hour
const EMAIL_VERIFICATION_EXPIRY_MS = 6 * 60 * 60 * 1000 // 6 hours
const PASSWORD_RESET_EXPIRY_MS = 15 * 60 * 1000 // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 7

// Create router
export const authRouter = new Hono<{ Bindings: Env }>()

// ============================================
// POST /api/auth/register
// ============================================
authRouter.post('/register', registerRateLimiter, async (c) => {
  try {
    // ── Body size guard ────────────────────────────────────────────────────
    const rawBody = await c.req.text()
    if (rawBody.length > MAX_REQUEST_BODY_SIZE) {
      return c.json({ error: 'Zbyt duży rozmiar żądania' }, 413)
    }

    const body = JSON.parse(rawBody) as RegisterBody
    
    // ── Sanitize inputs ────────────────────────────────────────────────────
    const email = normalizeEmail(body.email)
    const password = typeof body.password === 'string' ? body.password : ''
    const name = sanitize(body.name, 100)
    const consents = body.consents
    
    // Validate email format (stricter regex)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!email || email.length > 254 || !emailRegex.test(email)) {
      return c.json({ error: 'Nieprawidłowy adres email' }, 400)
    }
    
    // Validate consents (terms and privacy are required)
    if (!consents?.terms || !consents?.privacy) {
      return c.json({ error: 'Musisz zaakceptować regulamin i politykę prywatności' }, 400)
    }
    
    // Validate password strength
    const passwordCheck = isPasswordStrong(password)
    if (!passwordCheck.isStrong) {
      return c.json({ error: passwordCheck.errors[0], errors: passwordCheck.errors }, 400)
    }
    
    const db = c.get('db')
    
    // ── Timing-safe: always hash even if user exists ─────────────────────
    // This prevents timing attacks that enumerate existing emails.
    const passwordHash = await hashPassword(password)
    
    // Check if email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    })
    
    if (existingUser) {
      // Return generic success to prevent email enumeration.
      // The real user will recognise they already have an account
      // when they don't receive a verification email.
      return c.json({
        success: true,
        requiresEmailVerification: true,
        message: 'Sprawdź swoją skrzynkę email, aby zweryfikować konto'
      }, 201)
    }
    
    // Get IP and User-Agent
    const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Real-IP') || 'unknown'
    const userAgent = sanitize(c.req.header('User-Agent'), 500) || 'unknown'
    
    // Create user
    const [newUser] = await db.insert(users).values({
      email,
      passwordHash,
      name: name || null,
      role: 'customer',
      emailVerified: false,
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      marketingConsent: consents.marketing || false,
      analyticsConsent: consents.analytics || false,
      gdprConsentDate: new Date(),
      consentIpAddress: ipAddress,
      consentUserAgent: userAgent,
    }).returning()
    
    // Record consents
    type ConsentRecord = typeof userConsents.$inferInsert
    const consentRecords: ConsentRecord[] = [
      { userId: newUser.id, consentType: 'terms', granted: true, version: TERMS_VERSION, ipAddress, userAgent },
      { userId: newUser.id, consentType: 'privacy', granted: true, version: PRIVACY_VERSION, ipAddress, userAgent },
    ]
    
    if (consents.marketing !== undefined) {
      consentRecords.push({ userId: newUser.id, consentType: 'marketing', granted: consents.marketing, version: '1.0', ipAddress, userAgent })
    }
    if (consents.analytics !== undefined) {
      consentRecords.push({ userId: newUser.id, consentType: 'analytics', granted: consents.analytics, version: '1.0', ipAddress, userAgent })
    }
    
    await db.insert(userConsents).values(consentRecords)
    
    // Generate email verification token
    const verificationToken = generateSecureToken(32)
    const verificationTokenHash = await hashToken(verificationToken)
    
    await db.insert(emailVerificationTokens).values({
      userId: newUser.id,
      tokenHash: verificationTokenHash,
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS),
    })
    
    // TODO: Send verification email (Week 4 - SES integration)
    
    return c.json({
      success: true,
      requiresEmailVerification: true,
      message: 'Sprawdź swoją skrzynkę email, aby zweryfikować konto'
    }, 201)
    
  } catch (error) {
    console.error('Register error:', errMsg(error))
    return c.json({ error: 'Wystąpił błąd podczas rejestracji' }, 500)
  }
})

// ============================================
// POST /api/auth/login
// ============================================
authRouter.post('/login', loginRateLimiter, async (c) => {
  try {
    // ── Body size guard ────────────────────────────────────────────────────
    const rawBody = await c.req.text()
    if (rawBody.length > MAX_REQUEST_BODY_SIZE) {
      return c.json({ error: 'Zbyt duży rozmiar żądania' }, 413)
    }

    const body = JSON.parse(rawBody) as LoginBody
    const email = normalizeEmail(body.email)
    const password = typeof body.password === 'string' ? body.password : ''
    const rememberMe = body.rememberMe === true

    if (!email || !password) {
      return c.json({ error: 'Email i hasło są wymagane' }, 400)
    }

    const db = c.get('db')
    const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Real-IP') || 'unknown'
    const userAgent = sanitize(c.req.header('User-Agent'), 500) || 'unknown'

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    })

    if (!user) {
      // Timing-safe: run a real bcrypt compare so response time is constant
      // regardless of whether user exists
      await verifyPassword(password, '$2b$12$3OrMR3Gssjf39D8Pu4SZKeBWQTpVpH3N38c.ZkH3N3ox3Vo5J2SBe')
      return c.json({ error: 'Nieprawidłowy email lub hasło' }, 401)
    }
    
    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const lockedMinutes = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000)
      return c.json({ 
        error: `Konto zostało tymczasowo zablokowane. Spróbuj ponownie za ${lockedMinutes} minut.`,
        lockedUntil: user.lockedUntil 
      }, 403)
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)

    if (!isValidPassword) {
      // Increment failed attempts
      const newAttempts = user.failedLoginAttempts + 1
      const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS
      
      await db.update(users)
        .set({
          failedLoginAttempts: newAttempts,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id))
      
      // Log failed attempt
      await db.insert(auditLog).values({
        action: 'login',
        targetUserId: user.id,
        ipAddress,
        userAgent,
        details: { success: false, reason: 'invalid_password', attempts: newAttempts }
      })
      
      if (shouldLock) {
        return c.json({ error: 'Zbyt wiele nieudanych prób logowania. Konto zostało zablokowane na 1 godzinę.' }, 403)
      }
      
      return c.json({ error: 'Nieprawidłowy email lub hasło' }, 401)
    }
    
    // Check if email is verified
    if (!user.emailVerified) {
      return c.json({ 
        error: 'Email nie został zweryfikowany. Sprawdź skrzynkę odbiorczą.',
        requiresEmailVerification: true 
      }, 403)
    }
    
    // Check if user accepted current versions of terms/privacy
    const requiresNewConsent = user.termsVersion !== TERMS_VERSION || user.privacyVersion !== PRIVACY_VERSION
    
    // Reset failed attempts and update last login
    await db.update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))
    
    // Generate tokens
    const accessExpiresIn = rememberMe ? '24h' : (user.role === 'admin' ? '2h' : '24h')
    const { accessToken, refreshToken } = await generateTokenPair(
      { id: user.id.toString(), email: user.email, role: user.role },
      crypto.randomUUID(),
      c.env.JWT_ACCESS_SECRET,
      c.env.JWT_REFRESH_SECRET,
      accessExpiresIn,
      '7d'
    )
    
    // Store session with hashed refresh token
    const refreshTokenHash = await hashToken(refreshToken)
    
    await db.insert(sessions).values({
      userId: user.id,
      refreshTokenHash,
      ipAddress,
      userAgent,
      isActive: true,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    })
    
    // Set cookies
    setAuthCookies(c, accessToken, refreshToken, rememberMe)
    
    // Log successful login
    await db.insert(auditLog).values({
      action: 'login',
      targetUserId: user.id,
      ipAddress,
      userAgent,
      details: { success: true }
    })
    
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      requiresNewConsent
    })
    
  } catch (error) {
    console.error('Login error:', errMsg(error))
    return c.json({ error: 'Wystąpił błąd podczas logowania' }, 500)
  }
})

// ============================================
// POST /api/auth/refresh
// ============================================
authRouter.post('/refresh', async (c) => {
  try {
    const refreshToken = getRefreshTokenFromCookie(c)
    
    if (!refreshToken) {
      return c.json({ error: 'Brak tokena odświeżania' }, 401)
    }
    
    // Verify refresh token
    let tokenPayload: RefreshTokenPayload
    try {
      tokenPayload = await verifyRefreshToken(refreshToken, c.env.JWT_REFRESH_SECRET)
    } catch {
      clearAuthCookies(c)
      return c.json({ error: 'Nieprawidłowy token odświeżania' }, 401)
    }
    
    const db = c.get('db')
    const refreshTokenHash = await hashToken(refreshToken)
    
    // Find session by token hash
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.refreshTokenHash, refreshTokenHash),
      with: { user: true }
    })
    
    if (!session) {
      clearAuthCookies(c)
      return c.json({ error: 'Sesja nie została znaleziona' }, 401)
    }
    
    // TOKEN REUSE DETECTION: If session is inactive, this is an attack!
    if (!session.isActive) {
      console.warn(`[SECURITY] Token reuse detected for user ${session.userId}`)
      
      // Invalidate ALL sessions for this user
      await db.update(sessions)
        .set({ isActive: false })
        .where(eq(sessions.userId, session.userId))
      
      // Log security incident
      await db.insert(auditLog).values({
        action: 'admin_action',
        targetUserId: session.userId,
        details: { 
          type: 'token_reuse_attack',
          message: 'All sessions invalidated due to token reuse detection'
        }
      })
      
      // TODO: Send email about suspicious activity (Week 4)
      console.log(`[EMAIL] Security alert for user ${session.userId}: Token reuse detected`)
      
      clearAuthCookies(c)
      return c.json({ error: 'Wykryto podejrzaną aktywność. Zaloguj się ponownie.' }, 401)
    }
    
    // Check if session expired
    if (new Date(session.expiresAt) < new Date()) {
      await db.update(sessions)
        .set({ isActive: false })
        .where(eq(sessions.id, session.id))
      
      clearAuthCookies(c)
      return c.json({ error: 'Sesja wygasła' }, 401)
    }
    
    // Deactivate old session (Token Rotation)
    await db.update(sessions)
      .set({ isActive: false })
      .where(eq(sessions.id, session.id))
    
    // Generate new tokens
    const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Real-IP') || 'unknown'
    const userAgent = sanitize(c.req.header('User-Agent'), 500) || 'unknown'
    
    const { accessToken, refreshToken: newRefreshToken } = await generateTokenPair(
      { id: session.user.id.toString(), email: session.user.email, role: session.user.role },
      crypto.randomUUID(),
      c.env.JWT_ACCESS_SECRET,
      c.env.JWT_REFRESH_SECRET,
      session.user.role === 'admin' ? '2h' : '24h',
      '7d'
    )
    
    // Create new session
    const newRefreshTokenHash = await hashToken(newRefreshToken)
    
    await db.insert(sessions).values({
      userId: session.userId,
      refreshTokenHash: newRefreshTokenHash,
      ipAddress,
      userAgent,
      isActive: true,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    })
    
    // Set new cookies
    setAuthCookies(c, accessToken, newRefreshToken)
    
    return c.json({ success: true })
    
  } catch (error) {
    console.error('Refresh error:', errMsg(error))
    return c.json({ error: 'Wystąpił błąd podczas odświeżania sesji' }, 500)
  }
})

// ============================================
// POST /api/auth/logout
// ============================================
authRouter.post('/logout', async (c) => {
  try {
    const refreshToken = getRefreshTokenFromCookie(c)
    
    if (refreshToken) {
      const db = c.get('db')
      const refreshTokenHash = await hashToken(refreshToken)
      
      // Deactivate session
      await db.update(sessions)
        .set({ isActive: false })
        .where(eq(sessions.refreshTokenHash, refreshTokenHash))
    }
    
    clearAuthCookies(c)
    
    return c.json({ success: true })
    
  } catch (error) {
    console.error('Logout error:', errMsg(error))
    clearAuthCookies(c)
    return c.json({ success: true })
  }
})

// ============================================
// POST /api/auth/logout-all
// ============================================
authRouter.post('/logout-all', async (c) => {
  try {
    const refreshToken = getRefreshTokenFromCookie(c)
    
    if (!refreshToken) {
      return c.json({ error: 'Nie jesteś zalogowany' }, 401)
    }
    
    // Verify token to get user ID
    let tokenPayload: RefreshTokenPayload
    try {
      tokenPayload = await verifyRefreshToken(refreshToken, c.env.JWT_REFRESH_SECRET)
    } catch {
      clearAuthCookies(c)
      return c.json({ error: 'Nieprawidłowy token' }, 401)
    }
    
    const db = c.get('db')
    const userId = parseInt(tokenPayload.sub)
    
    // Deactivate ALL sessions for this user
    await db.update(sessions)
      .set({ isActive: false })
      .where(eq(sessions.userId, userId))
    
    // Log action
    const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Real-IP') || 'unknown'
    await db.insert(auditLog).values({
      action: 'logout',
      targetUserId: userId,
      ipAddress,
      details: { type: 'logout_all_devices' }
    })
    
    clearAuthCookies(c)
    
    return c.json({ success: true, message: 'Wylogowano ze wszystkich urządzeń' })
    
  } catch (error) {
    console.error('Logout-all error:', errMsg(error))
    return c.json({ error: 'Wystąpił błąd' }, 500)
  }
})

// ============================================
// POST /api/auth/verify-email
// ============================================
authRouter.post('/verify-email', async (c) => {
  try {
    const body = await c.req.json<VerifyEmailBody>()
    const { token } = body
    
    if (!token) {
      return c.json({ error: 'Token weryfikacyjny jest wymagany' }, 400)
    }
    
    const db = c.get('db')
    const tokenHash = await hashToken(token)
    
    // Find token
    const verificationRecord = await db.query.emailVerificationTokens.findFirst({
      where: and(
        eq(emailVerificationTokens.tokenHash, tokenHash),
        gt(emailVerificationTokens.expiresAt, new Date())
      ),
      with: { user: true }
    })
    
    if (!verificationRecord) {
      return c.json({ error: 'Nieprawidłowy lub wygasły token weryfikacyjny' }, 400)
    }
    
    if (verificationRecord.usedAt) {
      return c.json({ error: 'Ten token został już wykorzystany' }, 400)
    }
    
    // Mark token as used
    await db.update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailVerificationTokens.id, verificationRecord.id))
    
    // Verify user email
    await db.update(users)
      .set({
        emailVerified: true,
        emailVerifiedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, verificationRecord.userId))
    
    return c.json({ 
      success: true, 
      message: 'Email został zweryfikowany. Możesz się teraz zalogować.'
    })
    
  } catch (error) {
    console.error('Verify email error:', errMsg(error))
    return c.json({ error: 'Wystąpił błąd podczas weryfikacji email' }, 500)
  }
})

// ============================================
// POST /api/auth/forgot-password
// ============================================
authRouter.post('/forgot-password', passwordResetRateLimiter, async (c) => {
  try {
    const rawBody = await c.req.text()
    if (rawBody.length > MAX_REQUEST_BODY_SIZE) {
      return c.json({ error: 'Zbyt duży rozmiar żądania' }, 413)
    }

    const body = JSON.parse(rawBody) as ResetPasswordRequestBody
    const email = normalizeEmail(body.email)
    
    if (!email) {
      return c.json({ error: 'Email jest wymagany' }, 400)
    }

    // Dual rate-limit: per-email prevents enumeration from rotating IPs
    const emailRateLimit = await checkRateLimitByKey(
      c,
      `reset:email:${email}`,
      { limit: 3, windowMs: 60 * 60 * 1000, blockDurationMs: 60 * 60 * 1000 }
    )
    if (emailRateLimit) return emailRateLimit

    const db = c.get('db')

    // Always return success for security (don't reveal if email exists)
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    })
    
    if (user) {
      // Generate reset token
      const resetToken = generateSecureToken(32)
      const resetTokenHash = await hashToken(resetToken)
      
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash: resetTokenHash,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS)
      })
      
      // TODO: Send password reset email (Week 4 - SES integration)
    }
    
    return c.json({ 
      success: true, 
      message: 'Jeśli podany email istnieje w naszym systemie, wyślemy link do resetowania hasła.'
    })
    
  } catch (error) {
    console.error('Forgot password error:', errMsg(error))
    return c.json({ error: 'Wystąpił błąd' }, 500)
  }
})

// ============================================
// POST /api/auth/reset-password
// ============================================
authRouter.post('/reset-password', async (c) => {
  try {
    const rawBody = await c.req.text()
    if (rawBody.length > MAX_REQUEST_BODY_SIZE) {
      return c.json({ error: 'Zbyt duży rozmiar żądania' }, 413)
    }

    const body = JSON.parse(rawBody) as ResetPasswordConfirmBody
    const token = sanitize(body.token, 256)
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
    
    if (!token || !newPassword) {
      return c.json({ error: 'Token i nowe hasło są wymagane' }, 400)
    }
    
    // Validate password strength
    const passwordCheck = isPasswordStrong(newPassword)
    if (!passwordCheck.isStrong) {
      return c.json({ error: passwordCheck.errors[0], errors: passwordCheck.errors }, 400)
    }
    
    const db = c.get('db')
    const tokenHash = await hashToken(token)
    
    // Find token
    const resetRecord = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    })
    
    if (!resetRecord) {
      return c.json({ error: 'Nieprawidłowy lub wygasły token resetowania' }, 400)
    }
    
    if (resetRecord.usedAt) {
      return c.json({ error: 'Ten token został już wykorzystany' }, 400)
    }
    
    // Hash new password
    const passwordHash = await hashPassword(newPassword)
    
    // Mark token as used
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetRecord.id))
    
    // Update user password
    await db.update(users)
      .set({
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, resetRecord.userId))
    
    // Invalidate all sessions (force re-login on all devices)
    await db.update(sessions)
      .set({ isActive: false })
      .where(eq(sessions.userId, resetRecord.userId))
    
    // Log password change
    const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Real-IP') || 'unknown'
    await db.insert(auditLog).values({
      action: 'admin_action',
      targetUserId: resetRecord.userId,
      ipAddress,
      details: { type: 'password_reset' }
    })
    
    // TODO: Send password changed notification email (Week 4)
    console.log(`[EMAIL] Password was changed for user ${resetRecord.userId}`)
    
    return c.json({ 
      success: true, 
      message: 'Hasło zostało zmienione. Zaloguj się używając nowego hasła.'
    })
    
  } catch (error) {
    console.error('Reset password error:', errMsg(error))
    return c.json({ error: 'Wystąpił błąd podczas resetowania hasła' }, 500)
  }
})

// ============================================
// POST /api/auth/resend-verification
// ============================================
authRouter.post('/resend-verification', passwordResetRateLimiter, async (c) => {
  try {
    const rawBody = await c.req.text()
    if (rawBody.length > MAX_REQUEST_BODY_SIZE) {
      return c.json({ error: 'Zbyt duży rozmiar żądania' }, 413)
    }

    const body = JSON.parse(rawBody) as { email: string }
    const email = normalizeEmail(body.email)
    
    if (!email) {
      return c.json({ error: 'Email jest wymagany' }, 400)
    }
    
    const db = c.get('db')
    
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    })
    
    if (user && !user.emailVerified) {
      // Generate new verification token
      const verificationToken = generateSecureToken(32)
      const verificationTokenHash = await hashToken(verificationToken)
      
      await db.insert(emailVerificationTokens).values({
        userId: user.id,
        tokenHash: verificationTokenHash,
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS)
      })
      
      // TODO: Send verification email (Week 4)
    }
    
    // Always return success for security
    return c.json({ 
      success: true, 
      message: 'Jeśli konto wymaga weryfikacji, wysłaliśmy nowy email.'
    })
    
  } catch (error) {
    console.error('Resend verification error:', errMsg(error))
    return c.json({ error: 'Wystąpił błąd' }, 500)
  }
})

// ============================================
// GET /api/auth/me - Get current user (protected)
// ============================================
authRouter.get('/me', requireAuth(), async (c) => {
  try {
    const payload = c.get('user')
    const db = c.get('db')
    
    const user = await db.query.users.findFirst({
      where: eq(users.id, parseInt(payload.sub))
    })
    
    if (!user) {
      return c.json({ error: 'Użytkownik nie znaleziony' }, 404)
    }
    
    // Verify account is not locked / deactivated
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return c.json({ error: 'Konto zablokowane' }, 403)
    }
    
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified
      }
    })
    
  } catch {
    return c.json({ error: 'Wystąpił błąd' }, 500)
  }
})

// ============================================
// POST /api/auth/change-password (protected)
// ============================================
authRouter.post('/change-password', requireAuth(), async (c) => {
  try {
    const rawBody = await c.req.text()
    if (rawBody.length > MAX_REQUEST_BODY_SIZE) {
      return c.json({ error: 'Zbyt duży rozmiar żądania' }, 413)
    }

    const body = JSON.parse(rawBody) as ChangePasswordBody
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

    if (!currentPassword || !newPassword) {
      return c.json({ error: 'Obecne hasło i nowe hasło są wymagane' }, 400)
    }

    // Validate new password strength
    const passwordCheck = isPasswordStrong(newPassword)
    if (!passwordCheck.isStrong) {
      return c.json({ error: passwordCheck.errors[0], errors: passwordCheck.errors }, 400)
    }

    const payload = c.get('user')
    const db = c.get('db')
    const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Real-IP') || 'unknown'
    const userAgent = sanitize(c.req.header('User-Agent'), 500) || 'unknown'

    const user = await db.query.users.findFirst({
      where: eq(users.id, parseInt(payload.sub))
    })

    if (!user) {
      return c.json({ error: 'Użytkownik nie znaleziony' }, 404)
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash)
    if (!isValid) {
      // Log failed attempt
      await db.insert(auditLog).values({
        action: 'admin_action',
        targetUserId: user.id,
        ipAddress,
        userAgent,
        details: { type: 'change_password_failed', reason: 'invalid_current_password' }
      })
      return c.json({ error: 'Nieprawidłowe obecne hasło' }, 401)
    }

    // Hash and save new password
    const passwordHash = await hashPassword(newPassword)
    await db.update(users)
      .set({
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))

    // Invalidate ALL other sessions (keep current one by rotating)
    await db.update(sessions)
      .set({ isActive: false })
      .where(eq(sessions.userId, user.id))

    // Log password change
    await db.insert(auditLog).values({
      action: 'admin_action',
      targetUserId: user.id,
      ipAddress,
      userAgent,
      details: { type: 'password_changed', method: 'authenticated' }
    })

    // Clear cookies — user must re-login with new password
    clearAuthCookies(c)

    return c.json({
      success: true,
      message: 'Hasło zostało zmienione. Zaloguj się ponownie.'
    })

  } catch (error) {
    console.error('Change password error:', errMsg(error))
    return c.json({ error: 'Wystąpił błąd podczas zmiany hasła' }, 500)
  }
})
