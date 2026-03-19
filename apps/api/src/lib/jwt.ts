import { SignJWT, jwtVerify, JWTPayload } from 'jose'

// Token payload types
export interface TokenPayload extends JWTPayload {
  sub: string        // user.id
  email: string
  role: 'customer' | 'admin'
  sessionId: string  // UUID from sessions table
  iat: number
  exp: number
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string        // user.id
  sessionId: string  // UUID from sessions table
  type: 'refresh'
  iat: number
  exp: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface UserForToken {
  id: string
  email: string
  role: 'customer' | 'admin'
}

/**
 * Sign a JWT token
 * @param payload - The payload to include in the token
 * @param secret - The secret key for signing
 * @param expiresIn - Expiration time (e.g., '2h', '7d', '24h')
 * @returns Signed JWT string
 */
export async function signToken(
  payload: Record<string, unknown>,
  secret: string,
  expiresIn: string
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret)
  
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey)
  
  return token
}

/**
 * Verify a JWT token
 * @param token - The JWT token to verify
 * @param secret - The secret key used for signing
 * @returns Decoded payload if valid
 * @throws Error if token is invalid or expired
 */
export async function verifyToken<T extends JWTPayload>(
  token: string,
  secret: string
): Promise<T> {
  const secretKey = new TextEncoder().encode(secret)
  
  try {
    const { payload } = await jwtVerify(token, secretKey)
    return payload as T
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        throw new Error('Token has expired')
      }
      if (error.message.includes('signature')) {
        throw new Error('Invalid token signature')
      }
    }
    throw new Error('Invalid token')
  }
}

/**
 * Generate access and refresh token pair
 * @param user - User object with id, email, and role
 * @param sessionId - UUID from the sessions table
 * @param accessSecret - Secret for signing access token
 * @param refreshSecret - Secret for signing refresh token
 * @param accessExpiresIn - Access token expiration (default: '2h' - use '24h' for "remember me")
 * @param refreshExpiresIn - Refresh token expiration (default: '7d')
 * @returns Object containing accessToken and refreshToken
 */
export async function generateTokenPair(
  user: UserForToken,
  sessionId: string,
  accessSecret: string,
  refreshSecret: string,
  accessExpiresIn: string = '2h',
  refreshExpiresIn: string = '7d'
): Promise<TokenPair> {
  // Access token payload
  const accessPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    role: user.role,
    sessionId
  }
  
  // Refresh token payload (minimal - only for token refresh)
  const refreshPayload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
    sub: user.id,
    sessionId,
    type: 'refresh'
  }
  
  const [accessToken, refreshToken] = await Promise.all([
    signToken(accessPayload, accessSecret, accessExpiresIn),
    signToken(refreshPayload, refreshSecret, refreshExpiresIn)
  ])
  
  return { accessToken, refreshToken }
}

/**
 * Verify an access token
 * @param token - The access token to verify
 * @param secret - The secret key used for signing
 * @returns Decoded TokenPayload if valid
 */
export async function verifyAccessToken(
  token: string,
  secret: string
): Promise<TokenPayload> {
  return verifyToken<TokenPayload>(token, secret)
}

/**
 * Verify a refresh token  
 * @param token - The refresh token to verify
 * @param secret - The secret key used for signing
 * @returns Decoded RefreshTokenPayload if valid
 */
export async function verifyRefreshToken(
  token: string,
  secret: string
): Promise<RefreshTokenPayload> {
  const payload = await verifyToken<RefreshTokenPayload>(token, secret)
  
  if (payload.type !== 'refresh') {
    throw new Error('Invalid refresh token')
  }
  
  return payload
}
