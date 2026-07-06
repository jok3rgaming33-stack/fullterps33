"use server"

import crypto from "crypto"
import { setAdminSession, clearAdminSession } from "@/lib/auth"

export type AdminAuthResult = { ok: boolean; message: string }

export async function adminLogin(password: string): Promise<AdminAuthResult> {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) {
    return { ok: false, message: "ADMIN_PASSWORD n'est pas configuré sur le serveur" }
  }
  const a = Buffer.from(password)
  const b = Buffer.from(expected)
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b)
  if (!valid) return { ok: false, message: "Mot de passe incorrect" }
  await setAdminSession()
  return { ok: true, message: "Connecté" }
}

export async function adminLogout() {
  await clearAdminSession()
}
