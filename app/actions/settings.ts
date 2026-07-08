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
  // postgres.js : passer la valeur via sql.json() pour une sérialisation jsonb correcte
  const jsonValue = sql.json(value)
  await sql`
    insert into app_settings (key, value, updated_at)
    values (${key}, ${jsonValue}, now())
    on conflict (key) do update set value = ${jsonValue}, updated_at = now()
  `
  revalidatePath("/")
  revalidatePath("/admin")
}

// ── Logistique panier ──────────────────────────────────────────────────────

export type DeliverySlot = { id: string; label: string; startHour: number; endHour: number }
export type MeetupSlot   = { id: string; label: string; hour: number }
export type CartConfig = {
  minDeliveryAmount: number
  deliverySlots: DeliverySlot[]
  meetupSlots: MeetupSlot[]
}
export type MapOrigin = { lat: number; lng: number; label?: string }

const DEFAULT_CART_CONFIG: CartConfig = {
  minDeliveryAmount: 50,
  deliverySlots: [
    { id: "d1", label: "14H - 17H", startHour: 14, endHour: 17 },
    { id: "d2", label: "18H - 20H", startHour: 18, endHour: 20 },
    { id: "d3", label: "21H - 02H", startHour: 21, endHour: 2  },
  ],
  meetupSlots: [
    { id: "m14", label: "14H", hour: 14 },
    { id: "m16", label: "16H", hour: 16 },
    { id: "m18", label: "18H", hour: 18 },
    { id: "m20", label: "20H", hour: 20 },
    { id: "m22", label: "22H", hour: 22 },
    { id: "m00", label: "00H", hour: 0  },
  ],
}

const DEFAULT_ORIGIN: MapOrigin = { lat: 44.8378, lng: -0.5792, label: "Bordeaux centre" }

export async function getCartConfig(): Promise<CartConfig> {
  const row = await getSetting("cart_config")
  if (!row) return DEFAULT_CART_CONFIG
  return { ...DEFAULT_CART_CONFIG, ...(row as object) } as CartConfig
}

export async function setCartConfig(config: CartConfig): Promise<void> {
  await setSetting("cart_config", config)
}

export async function getMapOrigin(): Promise<MapOrigin> {
  const row = await getSetting("map_origin")
  if (!row) return DEFAULT_ORIGIN
  return { ...DEFAULT_ORIGIN, ...(row as object) } as MapOrigin
}

export async function setMapOrigin(origin: MapOrigin): Promise<void> {
  await setSetting("map_origin", origin)
}

// ── Sections boutique ──────────────────────────────────────────────────────

export type ShopSection = {
  slug: string    // identifiant interne (ex: "vedette"), utilisé pour filtrer les produits
  eyebrow: string // sur-titre (ex: "En vedette")
  title: string   // titre principal (ex: "Édition Capsule")
  gridCols: string // classes Tailwind (ex: "md:grid-cols-4")
}

const DEFAULT_SECTIONS: ShopSection[] = [
  { slug: "vedette",    eyebrow: "En vedette",          title: "Édition Capsule",       gridCols: "md:grid-cols-4" },
  { slug: "nouveautes", eyebrow: "Fraîchement débarqués", title: "Nouveautés",           gridCols: "md:grid-cols-4" },
]

export async function getShopSections(): Promise<ShopSection[]> {
  const row = await getSetting("shop_sections")
  if (!row || !Array.isArray(row) || row.length === 0) return DEFAULT_SECTIONS
  return row as ShopSection[]
}

export async function setShopSections(sections: ShopSection[]): Promise<void> {
  // setSetting vérifie déjà isAdmin() — pas de double vérification
  await setSetting("shop_sections", sections)
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
