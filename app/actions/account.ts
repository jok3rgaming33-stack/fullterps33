"use server"

import { sql } from "@/lib/db"
import { hashPassword, verifyPassword } from "@/lib/password"
import { setCustomerSession, getCustomerId, clearCustomerSession } from "@/lib/auth"

export type AuthResult = { ok: boolean; message: string }

export type Customer = {
  id: number
  email: string
  name: string
  loyaltyPoints: number
}

export async function signup(name: string, email: string, password: string): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail || !password || password.length < 6) {
    return { ok: false, message: "Email invalide ou mot de passe trop court (6 caractères min.)" }
  }
  const existing = await sql`select id from customers where email = ${cleanEmail}`
  if (existing.length > 0) {
    return { ok: false, message: "Un compte existe déjà avec cet email" }
  }
  const passwordHash = hashPassword(password)
  const rows = await sql`
    insert into customers (email, password_hash, name)
    values (${cleanEmail}, ${passwordHash}, ${name.trim() || cleanEmail})
    returning id
  `
  setCustomerSession(rows[0].id)
  return { ok: true, message: "Compte créé" }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase()
  const rows = await sql`select id, password_hash from customers where email = ${cleanEmail}`
  const customer = rows[0]
  if (!customer || !verifyPassword(password, customer.password_hash)) {
    return { ok: false, message: "Email ou mot de passe incorrect" }
  }
  setCustomerSession(customer.id)
  return { ok: true, message: "Connecté" }
}

export async function logout() {
  clearCustomerSession()
}

export async function getCurrentCustomer(): Promise<Customer | null> {
  const id = getCustomerId()
  if (!id) return null
  const rows = await sql`select id, email, name, loyalty_points from customers where id = ${id}`
  const row = rows[0]
  if (!row) return null
  return { id: row.id, email: row.email, name: row.name, loyaltyPoints: row.loyalty_points }
}
