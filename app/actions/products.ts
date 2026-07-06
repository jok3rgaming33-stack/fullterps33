"use server"

import { sql } from "@/lib/db"
import { isAdmin } from "@/lib/auth"
import type { Product } from "@/lib/types"
import { revalidatePath } from "next/cache"

function mapRow(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    category: row.category,
    status: row.status,
    badge: row.badge,
    sizes: row.sizes ?? [],
    sku: row.sku,
    image: row.image,
  }
}

export async function listProducts(category?: Product["category"]): Promise<Product[]> {
  const rows = category
    ? await sql`select * from products where category = ${category} order by created_at asc`
    : await sql`select * from products order by created_at asc`
  return rows.map(mapRow)
}

export async function createProduct(input: Omit<Product, "id"> & { id?: string }) {
  if (!await isAdmin()) throw new Error("Non autorisé")
  const id = input.id || input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  await sql`
    insert into products (id, name, price, category, status, badge, sizes, sku, image)
    values (${id}, ${input.name}, ${input.price}, ${input.category}, ${input.status}, ${input.badge}, ${input.sizes}, ${input.sku}, ${input.image})
    on conflict (id) do update set
      name = excluded.name, price = excluded.price, category = excluded.category,
      status = excluded.status, badge = excluded.badge, sizes = excluded.sizes,
      sku = excluded.sku, image = excluded.image
  `
  revalidatePath("/")
  revalidatePath("/admin")
}

export async function deleteProduct(id: string) {
  if (!await isAdmin()) throw new Error("Non autorisé")
  await sql`delete from products where id = ${id}`
  revalidatePath("/")
  revalidatePath("/admin")
}
