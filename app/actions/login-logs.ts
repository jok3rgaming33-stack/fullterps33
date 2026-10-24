"use server"

import { headers } from "next/headers"
import { sql } from "@/lib/db"
import { isAdmin } from "@/lib/auth"

export type LoginLogRow = {
  id: number
  pseudo: string
  ip: string | null
  city: string | null
  country: string | null
  userAgent: string | null
  createdAt: string
  loggedOutAt: string | null
}

let schemaReady = false

async function ensureLoginSchema() {
  if (schemaReady) return
  await sql`
    create table if not exists login_logs (
      id serial primary key,
      user_token text not null,
      pseudo text not null,
      ip text,
      city text,
      country text,
      user_agent text,
      created_at timestamptz not null default now(),
      logged_out_at timestamptz
    )
  `
  await sql`create index if not exists login_logs_created_idx on login_logs (created_at desc)`
  await sql`create index if not exists login_logs_token_idx on login_logs (user_token)`
  schemaReady = true
}

function headerValue(value: string | null): string | null {
  if (!value?.trim()) return null
  try { return decodeURIComponent(value.trim()) } catch { return value.trim() }
}

function clientIp(h: Headers): string | null {
  const cf = h.get("cf-connecting-ip")?.trim()
  if (cf) return cf
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || null
}

export async function recordLogin(token: string) {
  const userToken = token?.trim()
  if (!userToken) return
  try {
    await ensureLoginSchema()
    const h = await headers()
    const ip = clientIp(h)
    const city = headerValue(h.get("x-vercel-ip-city") || h.get("cf-ipcity"))
    const country = headerValue(h.get("x-vercel-ip-country") || h.get("cf-ipcountry"))
    const userAgent = h.get("user-agent")?.slice(0, 300) ?? null

    const recent = await sql`
      select id from login_logs
      where user_token = ${userToken}
        and logged_out_at is null
        and created_at > now() - interval '2 minutes'
        and ip is not distinct from ${ip}
      limit 1
    `
    if (recent.length) return

    const users = await sql`select pseudo from users where token = ${userToken} limit 1`
    const pseudo = String((users[0] as unknown as { pseudo?: string } | undefined)?.pseudo ?? "Client")
    await sql`
      insert into login_logs (user_token, pseudo, ip, city, country, user_agent)
      values (${userToken}, ${pseudo}, ${ip}, ${city}, ${country}, ${userAgent})
    `
  } catch (error) {
    console.error("[login-logs] record", error)
  }
}

export async function recordLogout(token: string) {
  const userToken = token?.trim()
  if (!userToken) return
  try {
    await ensureLoginSchema()
    await sql`
      update login_logs
      set logged_out_at = now()
      where id = (
        select id from login_logs
        where user_token = ${userToken} and logged_out_at is null
        order by created_at desc
        limit 1
      )
    `
  } catch (error) {
    console.error("[login-logs] logout", error)
  }
}

export async function listLoginLogs(limit = 250): Promise<LoginLogRow[]> {
  if (!(await isAdmin())) return []
  try {
    await ensureLoginSchema()
    const cap = Math.min(400, Math.max(1, Math.trunc(limit)))
    const rows = await sql`
      select id, pseudo, ip, city, country, user_agent, created_at, logged_out_at
      from login_logs
      order by created_at desc
      limit ${cap}
    `
    return (rows as unknown as {
      id: number
      pseudo: string
      ip: string | null
      city: string | null
      country: string | null
      user_agent: string | null
      created_at: string
      logged_out_at: string | null
    }[]).map((row) => ({
      id: row.id,
      pseudo: row.pseudo,
      ip: row.ip,
      city: row.city,
      country: row.country,
      userAgent: row.user_agent,
      createdAt: row.created_at,
      loggedOutAt: row.logged_out_at,
    }))
  } catch (error) {
    console.error("[login-logs] list", error)
    return []
  }
}

export async function listLoginsForToken(token: string, limit = 20): Promise<LoginLogRow[]> {
  if (!(await isAdmin())) return []
  const userToken = token?.trim()
  if (!userToken) return []
  try {
    await ensureLoginSchema()
    const rows = await sql`
      select id, pseudo, ip, city, country, user_agent, created_at, logged_out_at
      from login_logs
      where user_token = ${userToken}
      order by created_at desc
      limit ${Math.min(50, Math.max(1, Math.trunc(limit)))}
    `
    return (rows as unknown as {
      id: number
      pseudo: string
      ip: string | null
      city: string | null
      country: string | null
      user_agent: string | null
      created_at: string
      logged_out_at: string | null
    }[]).map((row) => ({
      id: row.id,
      pseudo: row.pseudo,
      ip: row.ip,
      city: row.city,
      country: row.country,
      userAgent: row.user_agent,
      createdAt: row.created_at,
      loggedOutAt: row.logged_out_at,
    }))
  } catch {
    return []
  }
}
