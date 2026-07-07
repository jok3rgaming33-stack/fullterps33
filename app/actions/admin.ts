'use server'

import { verifyAdminPassword, setAdminSession, clearAdminSession, isAdmin } from '@/lib/auth'

export async function loginAdmin(password: string): Promise<{ ok: boolean; message: string }> {
  const valid = await verifyAdminPassword(password)
  if (!valid) {
    return { ok: false, message: 'Mot de passe incorrect.' }
  }
  await setAdminSession()
  return { ok: true, message: 'Connecté.' }
}

export async function logoutAdmin(): Promise<void> {
  await clearAdminSession()
}

export { isAdmin }
