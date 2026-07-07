"use server"

import { sql } from "@/lib/db"
import { getCustomerToken, clearCustomerSession } from "@/lib/auth"

export type AuthResult = { ok: boolean; message: string }

export type Customer = {
  token: string
  pseudo: string
  loyaltyPoints: number
}

export async function logout() {
  await clearCustomerSession()
}

export async function getCurrentCustomer(): Promise<Customer | null> {
  const token = await getCustomerToken()
  if (!token) return null
  const rows = await sql`
    select token, pseudo, loyalty_points from users where token = ${token}
  `
  const row = rows[0]
  if (!row) return null
  return { token: row.token, pseudo: row.pseudo, loyaltyPoints: row.loyalty_points }
}
