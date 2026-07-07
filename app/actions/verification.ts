'use server'

import { sql } from '@/lib/db'
import { del } from '@vercel/blob'
import { nanoid } from 'nanoid'
import { getCustomerToken } from '@/lib/auth'
import { isAdmin } from '@/lib/auth'

export type VerificationStatus = 'pending' | 'validated' | 'rejected'

export interface UserVerification {
  id: string
  user_token: string
  photo_pathname: string | null
  video_pathname: string | null
  status: VerificationStatus
  validated_at: string | null
  created_at: string
  rejection_reason: string | null
}

/**
 * Get verification status for current user
 */
export async function getVerificationStatus(): Promise<UserVerification | null> {
  try {
    const token = await getCustomerToken()
    if (!token) return null

    const rows = await sql`
      select * from user_verifications where user_token = ${token}
    `
    return rows.length > 0 ? (rows[0] as unknown as UserVerification) : null
  } catch {
    return null
  }
}

/**
 * Create initial KYC record for user
 */
export async function initializeVerification(): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const token = await getCustomerToken()
    if (!token) return { ok: false, error: 'Non authentifié' }

    const id = nanoid()
    await sql`
      insert into user_verifications (id, user_token, status)
      values (${id}, ${token}, 'pending')
      on conflict (user_token) do nothing
    `
    return { ok: true, id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur' }
  }
}

/**
 * Save uploaded file pathname to verification record
 */
export async function saveVerificationFile(
  type: 'photo' | 'video',
  pathname: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = await getCustomerToken()
    if (!token) return { ok: false, error: 'Non authentifié' }

    if (type === 'photo') {
      await sql`
        update user_verifications 
        set photo_pathname = ${pathname}
        where user_token = ${token}
      `
    } else {
      await sql`
        update user_verifications 
        set video_pathname = ${pathname}
        where user_token = ${token}
      `
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur' }
  }
}

/**
 * List all pending verifications for admin
 */
export async function listPendingVerifications(): Promise<
  (UserVerification & { pseudo: string; email?: string })[] | null
> {
  try {
    if (!(await isAdmin())) return null

    const rows = await sql`
      select 
        uv.*,
        u.pseudo
      from user_verifications uv
      join users u on u.token = uv.user_token
      where uv.status = 'pending'
      order by uv.created_at asc
    `
    return rows as unknown as (UserVerification & { pseudo: string })[]
  } catch {
    return null
  }
}

/**
 * Validate KYC (admin only)
 */
export async function validateVerification(
  userToken: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!(await isAdmin())) return { ok: false, error: 'Accès refusé' }

    await sql`
      update user_verifications 
      set status = 'validated', validated_at = now()
      where user_token = ${userToken}
    `
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur' }
  }
}

/**
 * Reject KYC (admin only)
 */
export async function rejectVerification(
  userToken: string,
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!(await isAdmin())) return { ok: false, error: 'Accès refusé' }

    // Get files to delete
    const rows = await sql`
      select photo_pathname, video_pathname from user_verifications 
      where user_token = ${userToken}
    `

    if (rows.length > 0) {
      const rec = rows[0] as { photo_pathname?: string; video_pathname?: string }
      if (rec.photo_pathname) await del(rec.photo_pathname)
      if (rec.video_pathname) await del(rec.video_pathname)
    }

    await sql`
      update user_verifications 
      set status = 'rejected', rejection_reason = ${reason}, 
          photo_pathname = null, video_pathname = null
      where user_token = ${userToken}
    `
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur' }
  }
}
