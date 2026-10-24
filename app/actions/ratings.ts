"use server"

import { sql } from "@/lib/db"
import { getCustomerToken, isAdmin } from "@/lib/auth"
import { hasAccount } from "@/lib/shop-access"
import { revalidatePath } from "next/cache"
import {
  averageScore,
  isRatingScore,
  type ProductRatingSummary,
  type RatingScores,
} from "@/lib/ratings"

export type { ProductRatingSummary, RatingScores }

export type ProductRatingDetail = {
  id: number
  pseudo: string
  taste: number
  bottle: number
  packaging: number
  delivery: number
  comment: string | null
  createdAt: string
  avgScore: number
}

export type RatableProduct = {
  threadId: number
  productId: string
  productName: string
  alreadyRated: boolean
}

export type RatingInviteTarget = {
  threadId: number
  customerName: string
  summary: string
  total: number
  fulfillment: string
  productCount: number
  ratedCount: number
  pendingCount: number
  invitedAt: string | null
}

export type RatingAdminOverview = {
  targets: RatingInviteTarget[]
  stats: {
    pendingOrders: number
    totalRatings: number
    avgScore: number | null
  }
  recent: {
    id: number
    productName: string
    pseudo: string
    threadId: number
    avgScore: number
    comment: string | null
    createdAt: string
  }[]
}

type StoredItem = { productId: string; name: string; quantity: number }
type CatalogProduct = { id: string; name: string }

let schemaReady = false

async function ensureRatingsSchema() {
  if (schemaReady) return
  await sql`
    create table if not exists product_ratings (
      id serial primary key,
      product_id text not null,
      user_token text not null,
      thread_id integer not null,
      taste integer not null,
      bottle integer not null,
      packaging integer not null,
      delivery integer not null,
      comment text,
      created_at timestamptz not null default now()
    )
  `
  await sql`
    create unique index if not exists product_ratings_once
    on product_ratings (product_id, user_token, thread_id)
  `
  await sql`alter table order_threads add column if not exists items jsonb not null default '[]'::jsonb`
  await sql`alter table order_threads add column if not exists rating_invited_at timestamptz`
  schemaReady = true
}

function normName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

function readStoredItems(raw: unknown): StoredItem[] {
  let parsed: unknown = raw
  if (typeof raw === "string") {
    try { parsed = JSON.parse(raw) } catch { return [] }
  }
  if (!Array.isArray(parsed)) return []
  const out: StoredItem[] = []
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue
    const row = item as unknown as { productId?: unknown; name?: unknown; quantity?: unknown }
    const productId = String(row.productId ?? "").trim()
    if (!productId) continue
    out.push({
      productId,
      name: String(row.name ?? "").trim(),
      quantity: Math.max(1, Math.floor(Number(row.quantity) || 1)),
    })
  }
  return out
}

function parseLegacyNames(products: string | null): string[] {
  if (!products?.trim()) return []
  return products.split("+").flatMap((part) => {
    const match = part.trim().match(/^\d+\s*[×x]\s+(.+?)(?:\s*\([^)]*\))?$/)
    const name = (match?.[1] ?? "").trim()
    return name ? [name] : []
  })
}

function resolveThreadProducts(
  itemsRaw: unknown,
  productsText: string | null,
  catalog: CatalogProduct[],
): { productId: string; productName: string }[] {
  const byId = new Map(catalog.map((p) => [p.id, p.name]))
  const byName = new Map(catalog.map((p) => [normName(p.name), p]))
  const stored = readStoredItems(itemsRaw)
  const source = stored.length
    ? stored.map((item) => ({
        productId: item.productId,
        productName: item.name || byId.get(item.productId) || "Produit",
      }))
    : parseLegacyNames(productsText).flatMap((name) => {
        const found = byName.get(normName(name))
        return found ? [{ productId: found.id, productName: found.name }] : []
      })

  const seen = new Set<string>()
  return source.filter((item) => {
    if (seen.has(item.productId)) return false
    seen.add(item.productId)
    return true
  })
}

async function catalog(): Promise<CatalogProduct[]> {
  const rows = await sql`select id, name from products`
  return (rows as unknown as { id: string; name: string }[]).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? "Produit"),
  }))
}

function scoresOf(row: { taste: number; bottle: number; packaging: number; delivery: number }): RatingScores {
  return {
    taste: Number(row.taste),
    bottle: Number(row.bottle),
    packaging: Number(row.packaging),
    delivery: Number(row.delivery),
  }
}

export async function submitRating(input: {
  threadId: number
  productId: string
  scores: RatingScores
  comment?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureRatingsSchema()
  const token = await getCustomerToken()
  if (!token) return { ok: false, error: "Connecte-toi pour noter." }

  const scores = input.scores
  for (const value of [scores?.taste, scores?.bottle, scores?.packaging, scores?.delivery]) {
    if (!isRatingScore(Number(value))) return { ok: false, error: "Chaque note va de 1 à 5." }
  }

  const threadId = Math.trunc(Number(input.threadId))
  const productId = String(input.productId ?? "").trim()
  if (!threadId || !productId) return { ok: false, error: "Produit introuvable." }

  const threads = await sql`
    select id, status, products, items
    from order_threads
    where id = ${threadId} and user_token = ${token}
    limit 1
  `
  const thread = threads[0] as unknown as { status?: string; products?: string | null; items?: unknown } | undefined
  if (!thread) return { ok: false, error: "Commande introuvable." }
  if (thread.status !== "livree") return { ok: false, error: "La commande doit être livrée pour être notée." }

  const products = resolveThreadProducts(thread.items, thread.products ?? null, await catalog())
  if (!products.some((p) => p.productId === productId)) {
    return { ok: false, error: "Ce produit ne fait pas partie de la commande." }
  }

  const comment = (input.comment ?? "").trim().slice(0, 500) || null
  try {
    await sql`
      insert into product_ratings (
        product_id, user_token, thread_id, taste, bottle, packaging, delivery, comment
      ) values (
        ${productId}, ${token}, ${threadId},
        ${scores.taste}, ${scores.bottle}, ${scores.packaging}, ${scores.delivery},
        ${comment}
      )
    `
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.toLowerCase().includes("unique") || message.toLowerCase().includes("duplicate")) {
      return { ok: false, error: "Tu as déjà noté ce produit pour cette commande." }
    }
    return { ok: false, error: "Enregistrement impossible." }
  }

  revalidatePath("/")
  revalidatePath("/compte")
  return { ok: true }
}

export async function getRatableProducts(threadId?: number): Promise<RatableProduct[]> {
  await ensureRatingsSchema()
  const token = await getCustomerToken()
  if (!token) return []

  const delivered = threadId
    ? await sql`
        select id, products, items
        from order_threads
        where user_token = ${token} and status = 'livree' and id = ${Math.trunc(threadId)}
      `
    : await sql`
        select id, products, items
        from order_threads
        where user_token = ${token} and status = 'livree'
        order by updated_at desc
        limit 40
      `
  if (!delivered.length) return []

  const names = await catalog()
  const threadIds = delivered.map((row) => Number((row as unknown as { id: number }).id))
  const existing = await sql`
    select product_id, thread_id
    from product_ratings
    where user_token = ${token} and thread_id = any(${threadIds})
  `
  const rated = new Set(
    (existing as unknown as { product_id: string; thread_id: number }[]).map((row) => `${row.thread_id}:${row.product_id}`),
  )

  const out: RatableProduct[] = []
  for (const row of delivered as unknown as { id: number; products: string | null; items: unknown }[]) {
    for (const product of resolveThreadProducts(row.items, row.products, names)) {
      out.push({
        threadId: row.id,
        productId: product.productId,
        productName: product.productName,
        alreadyRated: rated.has(`${row.id}:${product.productId}`),
      })
    }
  }
  return out
}

export async function getProductRatingSummaries(productIds: string[]): Promise<Record<string, ProductRatingSummary>> {
  if (!(await hasAccount())) return {}
  const ids = [...new Set(productIds.map((id) => id.trim()).filter(Boolean))]
  if (!ids.length) return {}
  try {
    await ensureRatingsSchema()
    const rows = await sql`
      select product_id, taste, bottle, packaging, delivery
      from product_ratings
      where product_id = any(${ids})
    `
    const grouped = new Map<string, { sum: number; count: number }>()
    for (const row of rows as unknown as { product_id: string; taste: number; bottle: number; packaging: number; delivery: number }[]) {
      const current = grouped.get(row.product_id) ?? { sum: 0, count: 0 }
      grouped.set(row.product_id, { sum: current.sum + averageScore(scoresOf(row)), count: current.count + 1 })
    }
    const result: Record<string, ProductRatingSummary> = {}
    for (const [productId, { sum, count }] of grouped) {
      result[productId] = { productId, avgScore: Math.round((sum / count) * 10) / 10, count }
    }
    return result
  } catch (error) {
    console.error("[ratings] summaries", error)
    return {}
  }
}

export async function getProductRatingDetails(productId: string): Promise<ProductRatingDetail[]> {
  if (!(await hasAccount())) return []
  const id = productId?.trim()
  if (!id) return []
  await ensureRatingsSchema()
  const rows = await sql`
    select r.id, r.taste, r.bottle, r.packaging, r.delivery, r.comment, r.created_at, u.pseudo
    from product_ratings r
    left join users u on u.token = r.user_token
    where r.product_id = ${id}
    order by r.created_at desc
    limit 50
  `
  return (rows as unknown as {
    id: number
    taste: number
    bottle: number
    packaging: number
    delivery: number
    comment: string | null
    created_at: string
    pseudo: string | null
  }[]).map((row) => ({
    id: row.id,
    pseudo: row.pseudo?.trim() || "Client",
    taste: Number(row.taste),
    bottle: Number(row.bottle),
    packaging: Number(row.packaging),
    delivery: Number(row.delivery),
    comment: row.comment,
    createdAt: row.created_at,
    avgScore: averageScore(scoresOf(row)),
  }))
}

export async function getRatingsAdminOverview(): Promise<RatingAdminOverview> {
  const empty: RatingAdminOverview = {
    targets: [],
    stats: { pendingOrders: 0, totalRatings: 0, avgScore: null },
    recent: [],
  }
  if (!(await isAdmin())) return empty
  await ensureRatingsSchema()

  const [delivered, names, recentRows, scoreRows] = await Promise.all([
    sql`
      select id, customer_name, summary, total, fulfillment, products, items, rating_invited_at
      from order_threads
      where status = 'livree'
      order by updated_at desc
      limit 200
    `,
    catalog(),
    sql`
      select r.id, r.thread_id, r.taste, r.bottle, r.packaging, r.delivery, r.comment, r.created_at,
             u.pseudo, p.name as product_name
      from product_ratings r
      left join users u on u.token = r.user_token
      left join products p on p.id = r.product_id
      order by r.created_at desc
      limit 40
    `,
    sql`select taste, bottle, packaging, delivery from product_ratings`,
  ])

  const threadIds = (delivered as unknown as { id: number }[]).map((row) => row.id)
  const ratedRows = threadIds.length
    ? await sql`
        select thread_id, product_id from product_ratings where thread_id = any(${threadIds})
      `
    : []
  const ratedByThread = new Map<number, Set<string>>()
  for (const row of ratedRows as unknown as { thread_id: number; product_id: string }[]) {
    const set = ratedByThread.get(row.thread_id) ?? new Set<string>()
    set.add(row.product_id)
    ratedByThread.set(row.thread_id, set)
  }

  const targets: RatingInviteTarget[] = []
  for (const row of delivered as unknown as {
    id: number
    customer_name: string | null
    summary: string | null
    total: number
    fulfillment: string | null
    products: string | null
    items: unknown
    rating_invited_at: string | null
  }[]) {
    const products = resolveThreadProducts(row.items, row.products, names)
    if (!products.length) continue
    const ratedCount = products.filter((p) => ratedByThread.get(row.id)?.has(p.productId)).length
    targets.push({
      threadId: row.id,
      customerName: row.customer_name?.trim() || "Client",
      summary: row.summary?.trim() || `Commande #${row.id}`,
      total: Number(row.total ?? 0),
      fulfillment: row.fulfillment ?? "livraison",
      productCount: products.length,
      ratedCount,
      pendingCount: products.length - ratedCount,
      invitedAt: row.rating_invited_at,
    })
  }

  const scores = scoreRows as unknown as { taste: number; bottle: number; packaging: number; delivery: number }[]
  const avgScore = scores.length
    ? Math.round((scores.reduce((sum, row) => sum + averageScore(scoresOf(row)), 0) / scores.length) * 10) / 10
    : null

  return {
    targets: targets.filter((t) => t.pendingCount > 0),
    stats: {
      pendingOrders: targets.filter((t) => t.pendingCount > 0).length,
      totalRatings: scores.length,
      avgScore,
    },
    recent: (recentRows as unknown as {
      id: number
      thread_id: number
      taste: number
      bottle: number
      packaging: number
      delivery: number
      comment: string | null
      created_at: string
      pseudo: string | null
      product_name: string | null
    }[]).map((row) => ({
      id: row.id,
      productName: row.product_name?.trim() || "Produit",
      pseudo: row.pseudo?.trim() || "Client",
      threadId: row.thread_id,
      avgScore: averageScore(scoresOf(row)),
      comment: row.comment,
      createdAt: row.created_at,
    })),
  }
}

const INVITE_TEXT =
  "Tu peux noter les produits de cette commande livrée : goût, flacon, emballage, livraison ou retrait. Ouvre la commande dans Mon compte, puis Noter."

export async function sendRatingInvites(
  threadIds: number[],
): Promise<{ ok: true; sent: number; skipped: number } | { ok: false; error: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Non autorisé." }
  await ensureRatingsSchema()
  const ids = [...new Set(threadIds.map((id) => Math.trunc(Number(id))).filter((id) => id > 0))].slice(0, 100)
  if (!ids.length) return { ok: false, error: "Aucune commande sélectionnée." }

  const { addMessage } = await import("@/app/actions/messaging")
  const rows = await sql`
    select id, status, products, items
    from order_threads
    where id = any(${ids}) and status = 'livree'
  `
  const names = await catalog()
  const ratedRows = await sql`
    select thread_id, product_id from product_ratings where thread_id = any(${ids})
  `
  const ratedByThread = new Map<number, Set<string>>()
  for (const row of ratedRows as unknown as { thread_id: number; product_id: string }[]) {
    const set = ratedByThread.get(row.thread_id) ?? new Set<string>()
    set.add(row.product_id)
    ratedByThread.set(row.thread_id, set)
  }

  let sent = 0
  let skipped = 0
  for (const row of rows as unknown as { id: number; products: string | null; items: unknown }[]) {
    const products = resolveThreadProducts(row.items, row.products, names)
    const pending = products.some((p) => !ratedByThread.get(row.id)?.has(p.productId))
    if (!products.length || !pending) {
      skipped += 1
      continue
    }
    const result = await addMessage(row.id, "vendeur", INVITE_TEXT)
    if (!result.ok) {
      skipped += 1
      continue
    }
    await sql`update order_threads set rating_invited_at = now() where id = ${row.id}`
    sent += 1
  }
  revalidatePath("/admin")
  revalidatePath("/compte")
  return { ok: true, sent, skipped }
}

export async function deleteRating(id: number): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Non autorisé." }
  await ensureRatingsSchema()
  await sql`delete from product_ratings where id = ${Math.trunc(Number(id))}`
  revalidatePath("/")
  revalidatePath("/admin")
  return { ok: true }
}
