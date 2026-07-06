import { cookies } from "next/headers"
import crypto from "crypto"

const SECRET = process.env.SESSION_SECRET || "dev-secret-change-me-in-production"
const CUSTOMER_COOKIE = "ft33_session"
const ADMIN_COOKIE = "ft33_admin"

function sign(value: string): string {
  const mac = crypto.createHmac("sha256", SECRET).update(value).digest("hex")
  return `${value}.${mac}`
}

function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf(".")
  if (idx === -1) return null
  const value = signed.slice(0, idx)
  const mac = signed.slice(idx + 1)
  const expected = crypto.createHmac("sha256", SECRET).update(value).digest("hex")
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return null
  return crypto.timingSafeEqual(a, b) ? value : null
}

// ---- Session client ----

export async function setCustomerSession(customerId: number) {
  const cookieStore = await cookies()
  cookieStore.set(CUSTOMER_COOKIE, sign(String(customerId)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function getCustomerId(): Promise<number | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(CUSTOMER_COOKIE)?.value
  if (!raw) return null
  const value = unsign(raw)
  if (!value) return null
  const id = parseInt(value, 10)
  return Number.isNaN(id) ? null : id
}

export async function clearCustomerSession() {
  const cookieStore = await cookies()
  cookieStore.delete(CUSTOMER_COOKIE)
}

// ---- Session admin ----

export async function setAdminSession() {
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE, sign("admin"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4,
  })
}

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(ADMIN_COOKIE)?.value
  if (!raw) return false
  return unsign(raw) === "admin"
}

export async function clearAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE)
}
