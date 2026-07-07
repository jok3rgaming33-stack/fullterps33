'use server'

import { setAdminSession, clearAdminSession, isAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createHash } from 'crypto'

// Connexion admin par ADMIN_TOKEN (env var) — identique au modèle BB33.
// Tu positionnes simplement ADMIN_TOKEN=une-chaine-secrete dans Vercel env vars.
export async function loginAdmin(input: string): Promise<{ ok: boolean; error?: string }> {
  const val = input?.trim()
  if (!val) return { ok: false, error: 'Identifiant requis.' }

  // Vérifie contre ADMIN_TOKEN
  if (process.env.ADMIN_TOKEN && val === process.env.ADMIN_TOKEN) {
    await setAdminSession(process.env.ADMIN_TOKEN)
    return { ok: true }
  }

  // Fallback : ADMIN_PASSWORD (pratique en dev, à éviter en prod)
  if (process.env.ADMIN_PASSWORD && val === process.env.ADMIN_PASSWORD) {
    const sessionToken = createHash('sha256').update(val).digest('hex')
    await setAdminSession(sessionToken)
    return { ok: true }
  }

  return { ok: false, error: 'Token invalide.' }
}

export async function logoutAdmin() {
  await clearAdminSession()
  redirect('/')
}

// Alias pour compatibilité avec les composants existants
export const adminLogout = logoutAdmin

export { isAdmin }
