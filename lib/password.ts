import crypto from "crypto"

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.scryptSync(password, salt, 64).toString("hex")
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":")
  if (!salt || !hash) return false
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex")
  const a = Buffer.from(hash, "hex")
  const b = Buffer.from(candidate, "hex")
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
