"use server"

import { sql } from "@/lib/db"
import { isAdmin } from "@/lib/auth"
import { del } from "@vercel/blob"
import { revalidatePath } from "next/cache"
import type { Product, ProductVariant, DiscountType } from "@/lib/types"
import type { BadgeKey } from "@/lib/badges"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    price: row.price as number,
    category: row.category as string,
    status: row.status as Product["status"],
    badge: (row.badge as string | null) ?? null,
    badges: ((row.badges as string[]) ?? []) as BadgeKey[],
    sizes: (row.sizes as string[]) ?? [],
    sku: row.sku as string,
    stock: (row.stock as number) ?? 0,
    image: (row.image as string | null) ?? null,
    media: (row.media as string[]) ?? [],
    variants: (row.variants as ProductVariant[]) ?? [],
    discount_type: (row.discount_type as DiscountType | null) ?? null,
    discount_value: (row.discount_value as number | null) ?? null,
    sort_order: (row.sort_order as number) ?? 0,
    section: (row.section as string) ?? "general",
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  }
}

function genId(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 30)
  return `${base}-${Date.now().toString(36)}`
}

// ---------------------------------------------------------------------------
// List / Get
// ---------------------------------------------------------------------------

export async function listProducts(category?: string): Promise<Product[]> {
  const rows = category
    ? await sql`select * from products where category = ${category} order by sort_order asc, created_at desc`
    : await sql`select * from products order by sort_order asc, created_at desc`
  return (rows as Record<string, unknown>[]).map(rowToProduct)
}

export async function getProduct(id: string): Promise<Product | null> {
  const rows = await sql`select * from products where id = ${id}`
  if (!rows.length) return null
  return rowToProduct(rows[0] as Record<string, unknown>)
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export type ProductInput = {
  name: string
  description?: string | null
  price: number
  category: string
  status?: Product["status"]
  badges?: BadgeKey[]
  sizes?: string[]
  sku?: string
  stock?: number
  image?: string | null
  media?: string[]
  variants?: ProductVariant[]
  discount_type?: DiscountType | null
  discount_value?: number | null
  sort_order?: number
  section?: string
}

export async function createProduct(input: ProductInput): Promise<{ ok: boolean; id?: string; message?: string }> {
  if (!await isAdmin()) return { ok: false, message: "Non autorisé" }

  const id = genId(input.name)
  const sku = input.sku?.trim() || `FT-${id.toUpperCase().slice(0, 8)}`
  const badges = (input.badges ?? []) as string[]
  const sizes = input.sizes ?? []
  const media = input.media ?? []
  const variants = JSON.stringify(input.variants ?? [])

  await sql`
    insert into products (
      id, name, description, price, category, status,
      badge, badges, sizes, sku, stock,
      image, media, variants,
      discount_type, discount_value, sort_order, section
    ) values (
      ${id},
      ${input.name},
      ${input.description ?? null},
      ${input.price},
      ${input.category},
      ${input.status ?? "disponible"},
      ${badges[0] ?? null},
      ${badges},
      ${sizes},
      ${sku},
      ${input.stock ?? 0},
      ${input.image ?? null},
      ${media},
      ${variants}::jsonb,
      ${input.discount_type ?? null},
      ${input.discount_value ?? null},
      ${input.sort_order ?? 0},
      ${input.section ?? "general"}
    )
  `

  revalidatePath("/")
  revalidatePath("/admin")
  return { ok: true, id }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>
): Promise<{ ok: boolean; message?: string }> {
  if (!await isAdmin()) return { ok: false, message: "Non autorisé" }

  const existing = await getProduct(id)
  if (!existing) return { ok: false, message: "Produit introuvable" }

  const badges = ((input.badges ?? existing.badges) as string[])
  const variants = JSON.stringify(input.variants ?? existing.variants)
  const media = input.media ?? existing.media
  const sizes = input.sizes ?? existing.sizes

  await sql`
    update products set
      name           = ${input.name ?? existing.name},
      description    = ${input.description ?? existing.description},
      price          = ${input.price ?? existing.price},
      category       = ${input.category ?? existing.category},
      status         = ${input.status ?? existing.status},
      badge          = ${badges[0] ?? null},
      badges         = ${badges},
      sizes          = ${sizes},
      sku            = ${input.sku ?? existing.sku},
      stock          = ${input.stock ?? existing.stock},
      image          = ${input.image ?? existing.image},
      media          = ${media},
      variants       = ${variants}::jsonb,
      discount_type  = ${input.discount_type ?? existing.discount_type},
      discount_value = ${input.discount_value ?? existing.discount_value},
      sort_order     = ${input.sort_order ?? existing.sort_order},
      section        = ${input.section ?? existing.section},
      updated_at     = now()
    where id = ${id}
  `

  revalidatePath("/")
  revalidatePath("/admin")
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteProduct(id: string): Promise<{ ok: boolean; message?: string }> {
  if (!await isAdmin()) return { ok: false, message: "Non autorisé" }

  const product = await getProduct(id)
  if (!product) return { ok: false, message: "Produit introuvable" }

  // Supprimer les médias Blob associés
  const toDelete = [product.image, ...product.media].filter(Boolean) as string[]
  if (toDelete.length) {
    await Promise.allSettled(toDelete.map((url) => del(url)))
  }

  await sql`delete from products where id = ${id}`

  revalidatePath("/")
  revalidatePath("/admin")
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Reorder
// ---------------------------------------------------------------------------

export async function reorderProducts(ids: string[]): Promise<{ ok: boolean }> {
  if (!await isAdmin()) return { ok: false }
  await Promise.all(
    ids.map((id, index) =>
      sql`update products set sort_order = ${index}, updated_at = now() where id = ${id}`
    )
  )
  revalidatePath("/")
  revalidatePath("/admin")
  return { ok: true }
}
