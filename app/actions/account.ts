"use server"

import { sql } from "@/lib/db"
import { getCustomerToken, clearCustomerSession, isAdmin } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export type AuthResult = { ok: boolean; message: string }

export type Customer = {
  token: string
  pseudo: string
  loyaltyPoints: number
}

export type AdminUser = {
  id: number
  pseudo: string
  token: string
  loyalty_points: number
  loyalty_adjustment: number
  flags: Record<string, boolean>
  created_at: string
  created_ip: string | null
  admin_notes: string | null
  deleted_at: string | null
  order_count: number
  total_spent: number
}

/* ─────────────────── Customer ─────────────────── */

export async function logout() {
  await clearCustomerSession()
}

export async function getCurrentCustomer(): Promise<Customer | null> {
  const token = await getCustomerToken()
  if (!token) return null
  const rows = await sql`
    select token, pseudo, loyalty_points from users where token = ${token} and deleted_at is null
  `
  const row = rows[0]
  if (!row) return null
  return { token: row.token, pseudo: row.pseudo, loyaltyPoints: row.loyalty_points }
}

/* ─────────────────── Admin — lecture ─────────────────── */

export async function listAdminUsers(): Promise<AdminUser[]> {
  const admin = await isAdmin()
  if (!admin) throw new Error("Non autorisé")

  const rows = await sql`
    select
      u.id,
      u.pseudo,
      u.token,
      u.loyalty_points,
      coalesce(u.loyalty_adjustment, 0) as loyalty_adjustment,
      coalesce(u.flags, '{}')::jsonb     as flags,
      u.created_at,
      u.created_ip,
      u.admin_notes,
      u.deleted_at,
      count(o.id)::int                   as order_count,
      coalesce(sum(o.total), 0)::int     as total_spent
    from users u
    left join orders o on o.user_token = u.token
    group by u.id
    order by u.created_at desc
  `
  return rows as AdminUser[]
}

/* ─────────────────── Admin — flags ─────────────────── */

const VALID_FLAGS = ["fidele", "suspect", "absent", "banni"] as const
type Flag = typeof VALID_FLAGS[number]

export async function setUserFlag(
  userId: number,
  flag: Flag,
  value: boolean
): Promise<{ ok: boolean }> {
  const admin = await isAdmin()
  if (!admin) throw new Error("Non autorisé")

  await sql`
    update users
    set flags = jsonb_set(coalesce(flags, '{}'), ${`{${flag}}`}, ${value ? "true" : "false"})
    where id = ${userId}
  `
  revalidatePath("/admin")
  return { ok: true }
}

/* ─────────────────── Admin — points fidélité ─────────────────── */

export async function adjustLoyaltyPoints(
  userId: number,
  delta: number,
  reason?: string
): Promise<{ ok: boolean }> {
  const admin = await isAdmin()
  if (!admin) throw new Error("Non autorisé")

  await sql`
    update users
    set
      loyalty_points     = greatest(0, loyalty_points + ${delta}),
      loyalty_adjustment = coalesce(loyalty_adjustment, 0) + ${delta},
      admin_notes        = case
        when ${reason ?? null} is not null
        then concat(coalesce(admin_notes, ''), '\n[', now()::date, '] ', ${reason ?? ""})
        else admin_notes
      end
    where id = ${userId}
  `
  revalidatePath("/admin")
  return { ok: true }
}

/* ─────────────────── Admin — notes ─────────────────── */

export async function saveAdminNotes(
  userId: number,
  notes: string
): Promise<{ ok: boolean }> {
  const admin = await isAdmin()
  if (!admin) throw new Error("Non autorisé")

  await sql`update users set admin_notes = ${notes} where id = ${userId}`
  revalidatePath("/admin")
  return { ok: true }
}

/* ─────────────────── Admin — soft delete ─────────────────── */

export async function softDeleteUser(userId: number): Promise<{ ok: boolean }> {
  const admin = await isAdmin()
  if (!admin) throw new Error("Non autorisé")

  await sql`update users set deleted_at = now() where id = ${userId}`
  revalidatePath("/admin")
  return { ok: true }
}

export async function restoreUser(userId: number): Promise<{ ok: boolean }> {
  const admin = await isAdmin()
  if (!admin) throw new Error("Non autorisé")

  await sql`update users set deleted_at = null where id = ${userId}`
  revalidatePath("/admin")
  return { ok: true }
}
