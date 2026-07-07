'use server'

import { setAdminSession, clearAdminSession, isAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createHash } from 'crypto'

// Connexion admin par ADMIN_TOKEN (env var) — identique au modèle BB33.
// Tu positionnes simplement ADMIN_TOKEN=une-chaine-secrete dans Vercel env vars.
export async function loginAdmin(input: string): Promise<{ ok: boolean; error?: string }> {
  // Nettoie les espaces et retours à la ligne des deux côtés
  const val = (input ?? '').trim().replace(/\s+/g, '')
  if (!val) return { ok: false, error: 'Identifiant requis.' }

  const envToken = (process.env.ADMIN_TOKEN ?? '').trim().replace(/\s+/g, '')
  const envPassword = (process.env.ADMIN_PASSWORD ?? '').trim().replace(/\s+/g, '')

  // Vérifie contre ADMIN_TOKEN
  if (envToken && val === envToken) {
    await setAdminSession(envToken)
    return { ok: true }
  }

  // Fallback : ADMIN_PASSWORD
  if (envPassword && val === envPassword) {
    const sessionToken = createHash('sha256').update(envPassword).digest('hex')
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
