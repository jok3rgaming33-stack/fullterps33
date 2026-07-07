import { cookies } from 'next/headers'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me-in-production'
const CUSTOMER_COOKIE = 'ft33_session'
const ADMIN_COOKIE = 'ft33_admin'

// ---- HMAC signing for session cookies ----

function sign(value: string): string {
  const mac = crypto.createHmac('sha256', SECRET).update(value).digest('hex')
  return `${value}.${mac}`
}

function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf('.')
  if (idx === -1) return null
  const value = signed.slice(0, idx)
  const mac = signed.slice(idx + 1)
  const expected = crypto.createHmac('sha256', SECRET).update(value).digest('hex')
  const a = Buffer.from(mac, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length) return null
  return crypto.timingSafeEqual(a, b) ? value : null
}

// ---- User session (token-based, stateless) ----

export async function setCustomerSession(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(CUSTOMER_COOKIE, sign(token), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  })
}

export async function getCustomerToken(): Promise<string | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(CUSTOMER_COOKIE)?.value
  if (!raw) return null
  return unsign(raw)
}

export async function clearCustomerSession() {
  const cookieStore = await cookies()
  cookieStore.delete(CUSTOMER_COOKIE)
}

// ---- Admin session (Argon2 password, httpOnly cookie 1h) ----

/**
 * Verify a plaintext password against ADMIN_PASSWORD_HASH env var.
 * Returns true if password matches.
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH
  if (!hash) {
    // Fallback: compare against ADMIN_PASSWORD (plain) for dev convenience
    return password === (process.env.ADMIN_PASSWORD || '')
  }
  try {
    return await bcrypt.compare(password, hash)
  } catch {
    return false
  }
}

/**
 * Set admin session cookie (httpOnly, 1h expiry).
 */
export async function setAdminSession() {
  const cookieStore = await cookies()
  const sessionId = crypto.randomBytes(16).toString('hex')
  cookieStore.set(ADMIN_COOKIE, sign(sessionId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1 hour
  })
}

/**
 * Check if current request has a valid admin session cookie.
 */
export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(ADMIN_COOKIE)?.value
  if (!raw) return false
  return unsign(raw) !== null
}

/**
 * Clear the admin session cookie (logout).
 */
export async function clearAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE)
}
