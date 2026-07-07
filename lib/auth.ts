import { cookies, headers } from 'next/headers'
import crypto from 'crypto'

const CUSTOMER_COOKIE = 'ft33_session'
const ADMIN_COOKIE    = 'ft33_admin'

// ─── Helpers ────────────────────────────────────────────────────────────────

async function isHttps() {
  const hdrs = await headers()
  return (hdrs.get('x-forwarded-proto') ?? 'http') === 'https'
}

// ─── Utilisateur (token opaque, 1 an) ───────────────────────────────────────

export async function setCustomerSession(token: string) {
  const store = await cookies()
  const secure = await isHttps()
  store.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}

export async function getCustomerToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(CUSTOMER_COOKIE)?.value ?? null
}

export async function clearCustomerSession() {
  const store = await cookies()
  store.delete(CUSTOMER_COOKIE)
}

// ─── Admin (ADMIN_TOKEN ou pseudo+mot de passe scrypt) ───────────────────────

export async function setAdminSession(token: string) {
  const store = await cookies()
  const secure = await isHttps()
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 jours
  })
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies()
  const session = store.get(ADMIN_COOKIE)?.value
  if (!session) return false
  const envToken = (process.env.ADMIN_TOKEN ?? '').trim().replace(/\s+/g, '')
  if (envToken && session === envToken) return true
  const envPassword = (process.env.ADMIN_PASSWORD ?? '').trim().replace(/\s+/g, '')
  if (envPassword) {
    const derived = crypto.createHash('sha256').update(envPassword).digest('hex')
    if (session === derived) return true
  }
  return false
}

export async function clearAdminSession() {
  const store = await cookies()
  store.delete(ADMIN_COOKIE)
}

// ─── Scrypt (hash de mot de passe admin — aucune dépendance externe) ─────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = crypto.scryptSync(password, salt, 64)
  const original  = Buffer.from(hash, 'hex')
  return candidate.length === original.length && crypto.timingSafeEqual(candidate, original)
}
