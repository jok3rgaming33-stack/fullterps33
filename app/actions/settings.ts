"use server"

import { sql } from "@/lib/db"
import { isAdmin } from "@/lib/auth"
import { hasAccount } from "@/lib/shop-access"
import { revalidatePath } from "next/cache"
import { isForbiddenCopy, publicText } from "@/lib/brand"
import {
  SITE_RULES_KEY,
  normalizeSiteRules,
  publicSiteRules,
  readStoredRules,
  type SiteRule,
} from "@/lib/site-rules"

// ── Paramètres généraux ────────────────────────────────────────────────────

/**
 * Certaines valeurs anciennes ont été enregistrées doublement encodées
 * (la chaîne JSON elle-même entre guillemets, ex. `"Nouveautés"` affiché avec
 * ses guillemets). On les décode à la lecture.
 */
function unwrapQuoted(value: any): any {
  let v = value
  for (let i = 0; i < 3 && typeof v === "string"; i++) {
    const t = v.trim()
    if (t.length < 2 || !t.startsWith('"') || !t.endsWith('"')) break
    try {
      const parsed = JSON.parse(t)
      if (typeof parsed !== "string") break
      v = parsed
    } catch {
      v = t.slice(1, -1)
    }
  }
  return v
}

/** Lecture interne. Ne pas exporter : un export de ce fichier devient appelable sans page. */
async function readSetting(key: string): Promise<any> {
  const rows = await sql`select value from app_settings where key = ${key}`
  return unwrapQuoted(rows[0]?.value ?? null)
}

// Seul le nom public (déjà dans le titre de l'onglet) est lisible sans compte.
const PUBLIC_SETTING_KEYS = new Set(["site_name"])

export async function getSetting(key: string): Promise<any> {
  if (!PUBLIC_SETTING_KEYS.has(key) && !(await hasAccount())) return null
  return readSetting(key)
}

export async function getAllSettings(): Promise<Record<string, any>> {
  if (!(await isAdmin())) return {}
  const rows = await sql`select key, value from app_settings`
  return Object.fromEntries(rows.map((r: any) => [r.key, unwrapQuoted(r.value)]))
}

export async function setSetting(key: string, value: any): Promise<void> {
  if (!await isAdmin()) throw new Error("Non autorisé")
  // Sérialisation JSON explicite puis cast text → jsonb : sans ça, postgres.js
  // envoie booléens et nombres comme paramètres typés bool/int et Postgres refuse
  // (« column "value" is of type jsonb but expression is of type boolean ») —
  // le toggle « Boutique ouverte » ne s'enregistrait donc jamais.
  const json = JSON.stringify(value ?? null)
  await sql`
    insert into app_settings (key, value, updated_at)
    values (${key}, ${json}::text::jsonb, now())
    on conflict (key) do update set value = ${json}::text::jsonb, updated_at = now()
  `
  // Les réglages s'affichent sur toutes les pages (navbar, hero, footer, panier) :
  // on invalide tout l'arbre à partir du layout racine, pas seulement "/".
  revalidatePath("/", "layout")
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
  if (!(await hasAccount())) return { minDeliveryAmount: 0, deliverySlots: [], meetupSlots: [] }
  const row = await readSetting("cart_config")
  if (!row) return DEFAULT_CART_CONFIG
  return { ...DEFAULT_CART_CONFIG, ...(row as object) } as CartConfig
}

export async function setCartConfig(config: CartConfig): Promise<void> {
  await setSetting("cart_config", config)
}

export async function getMapOrigin(): Promise<MapOrigin> {
  if (!(await hasAccount())) return { lat: 0, lng: 0 }
  const row = await readSetting("map_origin")
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
  { slug: "vedette",    eyebrow: "En vedette", title: "Les classiques", gridCols: "md:grid-cols-4" },
  { slug: "nouveautes", eyebrow: "Arrivages",  title: "Nouveautés",     gridCols: "md:grid-cols-4" },
]

export async function getShopSections(): Promise<ShopSection[]> {
  if (!(await hasAccount())) return []
  const row = await readSetting("shop_sections")
  if (!row || !Array.isArray(row) || row.length === 0) return DEFAULT_SECTIONS
  return row as ShopSection[]
}

export async function setShopSections(sections: ShopSection[]): Promise<{ ok: boolean; error?: string }> {
  try {
    await setSetting("shop_sections", sections)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[v0] setShopSections error:", msg)
    return { ok: false, error: msg }
  }
}

/**
 * Met à jour uniquement le sur-titre et le titre d'une section de la page d'accueil.
 * Relit la valeur actuelle en base (et non l'état du client) pour ne pas écraser
 * les autres sections ni les modifications faites depuis l'onglet Sections.
 */
export async function setSectionHeading(
  slug: string,
  eyebrow: string,
  title: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!await isAdmin()) return { ok: false, error: "Non autorisé" }
  const row = await readSetting("shop_sections")
  const current: ShopSection[] = Array.isArray(row) && row.length > 0 ? row : DEFAULT_SECTIONS
  if (!current.some((s) => s.slug === slug)) return { ok: false, error: `Section « ${slug} » introuvable` }
  const next = current.map((s) => (s.slug === slug ? { ...s, eyebrow, title } : s))
  await setSetting("shop_sections", next)
  return { ok: true }
}

// ── Textes du site (sauvegarde groupée) ─────────────────────────────────────

const SITE_TEXT_KEYS = [
  "site_name", "hero_eyebrow", "hero_body", "hero_cta_label", "footer_tagline", "footer_copyright",
  "nav_label_capsule", "nav_label_nouveautes",
  "section_capsule_eyebrow", "section_capsule_title", "section_nouveautes_eyebrow", "section_nouveautes_title",
] as const

/**
 * Enregistre tout le groupe « Textes du site » en UNE requête serveur et une
 * transaction. Avant, l'admin envoyait 14 actions serveur l'une après l'autre
 * (chacune re-rendant toute la page /admin) : sur mobile/production la
 * sauvegarde pouvait durer longtemps et un rafraîchissement en cours de route
 * perdait les dernières clés.
 */
export async function saveSiteTextsAction(
  texts: Record<string, string>,
  headings: { slug: string; eyebrow: string; title: string }[],
): Promise<{ ok: boolean; error?: string; missing?: string[] }> {
  if (!await isAdmin()) return { ok: false, error: "Non autorisé" }
  try {
    const missing: string[] = []
    await sql.begin(async (tx: any) => {
      for (const key of SITE_TEXT_KEYS) {
        if (typeof texts[key] !== "string") continue
        const json = JSON.stringify(texts[key])
        await tx`
          insert into app_settings (key, value, updated_at)
          values (${key}, ${json}::text::jsonb, now())
          on conflict (key) do update set value = ${json}::text::jsonb, updated_at = now()
        `
        const [check] = await tx`select value from app_settings where key = ${key}`
        if (unwrapQuoted(check?.value) !== texts[key]) {
          throw new Error(`Relecture échouée (${key})`)
        }
      }
      if (headings.length) {
        const [row] = await tx`select value from app_settings where key = 'shop_sections' for update`
        const stored = row?.value
        const current: ShopSection[] = Array.isArray(stored) && stored.length > 0 ? stored : DEFAULT_SECTIONS
        const next = current.map((s) => {
          const h = headings.find((x) => x.slug === s.slug)
          return h ? { ...s, eyebrow: h.eyebrow, title: h.title } : s
        })
        for (const h of headings) if (!current.some((s) => s.slug === h.slug)) missing.push(h.slug)
        const json = JSON.stringify(next)
        await tx`
          insert into app_settings (key, value, updated_at)
          values ('shop_sections', ${json}::text::jsonb, now())
          on conflict (key) do update set value = ${json}::text::jsonb, updated_at = now()
        `
        const [check] = await tx`select value from app_settings where key = 'shop_sections'`
        const again = unwrapQuoted(check?.value)
        if (!Array.isArray(again)) throw new Error("Relecture échouée (shop_sections)")
        for (const h of headings) {
          if (missing.includes(h.slug)) continue
          const found = again.find((s: ShopSection) => s.slug === h.slug)
          if (!found || found.eyebrow !== h.eyebrow || found.title !== h.title) {
            throw new Error(`Relecture échouée (section ${h.slug})`)
          }
        }
      }
    })
    revalidatePath("/", "layout")
    revalidatePath("/admin")
    return { ok: true, missing }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[settings] saveSiteTextsAction error:", msg)
    return { ok: false, error: msg }
  }
}

// ── Modalités lues à l'inscription ─────────────────────────────────────────

/** Texte publié (formulations interdites retirées). Tableau vide = rien à lire. */
export async function getPublicSiteRules(): Promise<SiteRule[]> {
  const { rules } = readStoredRules(await readSetting(SITE_RULES_KEY))
  return publicSiteRules(rules)
}

/** Brouillon admin, y compris une liste volontairement vide. */
export async function getEditableSiteRules(): Promise<SiteRule[]> {
  if (!(await isAdmin())) return []
  const { rules } = readStoredRules(await readSetting(SITE_RULES_KEY))
  return rules
}

export async function saveSiteRules(rules: SiteRule[]): Promise<{ ok: boolean; error?: string }> {
  if (!await isAdmin()) return { ok: false, error: "Non autorisé" }
  const clean = normalizeSiteRules(rules)
  if (clean.length !== rules.length) {
    return { ok: false, error: "Chaque partie doit avoir un titre et un texte." }
  }
  try {
    await setSetting(SITE_RULES_KEY, { sections: clean })
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
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
  if (!(await isAdmin())) return []
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
  if (!(await hasAccount())) return null
  const rows = await sql`
    select * from news where active = true and popup = true order by created_at desc limit 1
  `
  if (rows.length === 0) return null
  const r = rows[0]
  if (isForbiddenCopy(`${r.title ?? ""} ${r.body ?? ""}`)) return null
  return { id: r.id, title: r.title, body: r.body, type: r.type, active: r.active, popup: r.popup, createdAt: r.created_at }
}

export async function createNews(data: Omit<NewsItem, "id" | "createdAt">): Promise<void> {
  if (!await isAdmin()) throw new Error("Non autorisé")
  await sql`
    insert into news (title, body, type, active, popup)
    values (${data.title}, ${data.body}, ${data.type}, ${data.active}, ${data.popup})
  `
  revalidatePath("/", "layout")
  revalidatePath("/admin")
}

export async function updateNews(id: number, data: Partial<Omit<NewsItem, "id" | "createdAt">>): Promise<void> {
  if (!await isAdmin()) throw new Error("Non autorisé")
  if (data.title !== undefined)  await sql`update news set title  = ${data.title}  where id = ${id}`
  if (data.body !== undefined)   await sql`update news set body   = ${data.body}   where id = ${id}`
  if (data.type !== undefined)   await sql`update news set type   = ${data.type}   where id = ${id}`
  if (data.active !== undefined) await sql`update news set active = ${data.active} where id = ${id}`
  if (data.popup !== undefined)  await sql`update news set popup  = ${data.popup}  where id = ${id}`
  revalidatePath("/", "layout")
  revalidatePath("/admin")
}

export async function deleteNews(id: number): Promise<void> {
  if (!await isAdmin()) throw new Error("Non autorisé")
  await sql`delete from news where id = ${id}`
  revalidatePath("/", "layout")
  revalidatePath("/admin")
}
