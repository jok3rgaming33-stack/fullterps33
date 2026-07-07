"use server"

import { sql } from "@/lib/db"
import { isAdmin } from "@/lib/auth"
import { revalidatePath } from "next/cache"

// ── Paramètres généraux ────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<any> {
  const rows = await sql`select value from app_settings where key = ${key}`
  return rows[0]?.value ?? null
}

export async function getAllSettings(): Promise<Record<string, any>> {
  const rows = await sql`select key, value from app_settings`
  return Object.fromEntries(rows.map((r: any) => [r.key, r.value]))
}

export async function setSetting(key: string, value: any): Promise<void> {
  if (!await isAdmin()) throw new Error("Non autorisé")
  await sql`
    insert into app_settings (key, value, updated_at)
    values (${key}, ${JSON.stringify(value)}::jsonb, now())
    on conflict (key) do update set value = ${JSON.stringify(value)}::jsonb, updated_at = now()
  `
  revalidatePath("/")
  revalidatePath("/admin")
}

// ── News / Annonces ────────────────────────────────────────────────────────

export type NewsItem = {
  id: number
  title: string
  body: string
  type: "info" | "warning" | "alert" | "promo"
  active: boolean
  popup: boolean
  createdAt: string
}

export async function listNews(onlyActive = false): Promise<NewsItem[]> {
  const rows = onlyActive
    ? await sql`select * from news where active = true order by created_at desc`
    : await sql`select * from news order by created_at desc`
  return rows.map((r: any) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    type: r.type,
    active: r.active,
    popup: r.popup,
    createdAt: r.created_at,
  }))
}

export async function getActivePopup(): Promise<NewsItem | null> {
  const rows = await sql`
    select * from news where active = true and popup = true order by created_at desc limit 1
  `
  if (rows.length === 0) return null
  const r = rows[0]
  return { id: r.id, title: r.title, body: r.body, type: r.type, active: r.active, popup: r.popup, createdAt: r.created_at }
}

export async function createNews(data: Omit<NewsItem, "id" | "createdAt">): Promise<void> {
  if (!await isAdmin()) throw new Error("Non autorisé")
  await sql`
    insert into news (title, body, type, active, popup)
    values (${data.title}, ${data.body}, ${data.type}, ${data.active}, ${data.popup})
  `
  revalidatePath("/")
  revalidatePath("/admin")
}

export async function updateNews(id: number, data: Partial<Omit<NewsItem, "id" | "createdAt">>): Promise<void> {
  if (!await isAdmin()) throw new Error("Non autorisé")
  if (data.title !== undefined)  await sql`update news set title  = ${data.title}  where id = ${id}`
  if (data.body !== undefined)   await sql`update news set body   = ${data.body}   where id = ${id}`
  if (data.type !== undefined)   await sql`update news set type   = ${data.type}   where id = ${id}`
  if (data.active !== undefined) await sql`update news set active = ${data.active} where id = ${id}`
  if (data.popup !== undefined)  await sql`update news set popup  = ${data.popup}  where id = ${id}`
  revalidatePath("/")
  revalidatePath("/admin")
}

export async function deleteNews(id: number): Promise<void> {
  if (!await isAdmin()) throw new Error("Non autorisé")
  await sql`delete from news where id = ${id}`
  revalidatePath("/")
  revalidatePath("/admin")
}
