"use server"

import crypto from "crypto"
import { revalidatePath } from "next/cache"
import { sql } from "@/lib/db"
import {
  getAdminCookie,
  hashPassword,
  isAdmin,
  isEnvAdmin,
  setAdminSession,
  verifyPassword,
} from "@/lib/auth"

export type StaffRole = "admin" | "livreur"

export type StaffRow = {
  id: number
  pseudo: string
  role: StaffRole
  active: boolean
  createdAt: string
}

export type Actor = {
  role: StaffRole
  pseudo: string
  id: number | null
  owner: boolean
}

let schemaReady = false

async function ensureStaffSchema() {
  if (schemaReady) return
  await sql`
    create table if not exists staff_accounts (
      id serial primary key,
      pseudo text not null,
      password_hash text not null,
      role text not null,
      active boolean not null default true,
      session_token text not null,
      created_at timestamptz not null default now()
    )
  `
  await sql`create unique index if not exists staff_accounts_pseudo_lower on staff_accounts (lower(pseudo))`
  await sql`create unique index if not exists staff_accounts_session on staff_accounts (session_token)`
  schemaReady = true
}

function cleanPseudo(raw: string) {
  return raw.trim().replace(/\s+/g, " ").slice(0, 40)
}

function isRole(value: string): value is StaffRole {
  return value === "admin" || value === "livreur"
}

export async function getActor(): Promise<Actor | null> {
  if (await isEnvAdmin()) return { role: "admin", pseudo: "Admin", id: null, owner: true }
  const session = await getAdminCookie()
  if (!session) return null
  await ensureStaffSchema()
  const rows = await sql`
    select id, pseudo, role
    from staff_accounts
    where session_token = ${session} and active = true
    limit 1
  `
  const row = rows[0] as { id: number; pseudo: string; role: string } | undefined
  if (!row || !isRole(row.role)) return null
  return { role: row.role, pseudo: row.pseudo, id: row.id, owner: false }
}

export async function loginStaff(pseudo: string, password: string): Promise<{ ok: true; role: StaffRole } | { ok: false; error: string }> {
  const name = cleanPseudo(pseudo ?? "")
  const pass = (password ?? "").trim()
  if (!name || !pass) return { ok: false, error: "Pseudo et mot de passe requis." }
  await ensureStaffSchema()
  const rows = await sql`
    select id, password_hash, role, active, session_token
    from staff_accounts
    where lower(pseudo) = lower(${name})
    limit 1
  `
  const row = rows[0] as { password_hash: string; role: string; active: boolean; session_token: string } | undefined
  if (!row || !row.active || !isRole(row.role) || !verifyPassword(pass, row.password_hash)) {
    return { ok: false, error: "Identifiants invalides." }
  }
  await setAdminSession(row.session_token)
  return { ok: true, role: row.role }
}

export async function listStaff(): Promise<StaffRow[]> {
  if (!(await isAdmin())) return []
  await ensureStaffSchema()
  const rows = await sql`
    select id, pseudo, role, active, created_at
    from staff_accounts
    order by created_at desc
  `
  const list = rows as unknown as { id: number; pseudo: string; role: string; active: boolean; created_at: string }[]
  return list
    .filter((r): r is { id: number; pseudo: string; role: StaffRole; active: boolean; created_at: string } => isRole(r.role))
    .map((r) => ({
      id: r.id,
      pseudo: r.pseudo,
      role: r.role,
      active: r.active,
      createdAt: String(r.created_at),
    }))
}

export async function createStaff(input: { pseudo: string; password: string; role: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Non autorisé." }
  const pseudo = cleanPseudo(input.pseudo ?? "")
  const password = (input.password ?? "").trim()
  const role = input.role
  if (pseudo.length < 2) return { ok: false, error: "Pseudo trop court." }
  if (password.length < 6) return { ok: false, error: "Mot de passe : 6 caractères minimum." }
  if (!isRole(role)) return { ok: false, error: "Rôle invalide." }
  await ensureStaffSchema()
  const existing = await sql`select id from staff_accounts where lower(pseudo) = lower(${pseudo}) limit 1`
  if (existing.length) return { ok: false, error: "Ce pseudo existe déjà." }
  const sessionToken = crypto.randomBytes(32).toString("hex")
  await sql`
    insert into staff_accounts (pseudo, password_hash, role, active, session_token)
    values (${pseudo}, ${hashPassword(password)}, ${role}, true, ${sessionToken})
  `
  revalidatePath("/admin")
  return { ok: true }
}

export async function updateStaff(input: {
  id: number
  pseudo: string
  password?: string
  role: string
  active: boolean
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Non autorisé." }
  const id = Number(input.id)
  const pseudo = cleanPseudo(input.pseudo ?? "")
  const password = (input.password ?? "").trim()
  const role = input.role
  if (!Number.isFinite(id)) return { ok: false, error: "Compte introuvable." }
  if (pseudo.length < 2) return { ok: false, error: "Pseudo trop court." }
  if (password && password.length < 6) return { ok: false, error: "Mot de passe : 6 caractères minimum." }
  if (!isRole(role)) return { ok: false, error: "Rôle invalide." }
  await ensureStaffSchema()
  const clash = await sql`
    select id from staff_accounts
    where lower(pseudo) = lower(${pseudo}) and id <> ${id}
    limit 1
  `
  if (clash.length) return { ok: false, error: "Ce pseudo existe déjà." }
  // Un nouveau mot de passe ou une désactivation invalide la session en cours.
  const rotateSession = Boolean(password) || input.active === false
  const sessionToken = rotateSession ? crypto.randomBytes(32).toString("hex") : null
  if (password && sessionToken) {
    await sql`
      update staff_accounts
      set pseudo = ${pseudo}, role = ${role}, active = ${input.active},
          password_hash = ${hashPassword(password)}, session_token = ${sessionToken}
      where id = ${id}
    `
  } else if (sessionToken) {
    await sql`
      update staff_accounts
      set pseudo = ${pseudo}, role = ${role}, active = ${input.active}, session_token = ${sessionToken}
      where id = ${id}
    `
  } else {
    await sql`
      update staff_accounts
      set pseudo = ${pseudo}, role = ${role}, active = ${input.active}
      where id = ${id}
    `
  }
  revalidatePath("/admin")
  return { ok: true }
}

export async function deleteStaff(id: number): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Non autorisé." }
  const clean = Number(id)
  if (!Number.isFinite(clean)) return { ok: false, error: "Compte introuvable." }
  await ensureStaffSchema()
  await sql`delete from staff_accounts where id = ${clean}`
  revalidatePath("/admin")
  return { ok: true }
}
