"use server"

import { sql } from "@/lib/db"
import { isAdmin } from "@/lib/auth"
import { getActor } from "@/app/actions/staff"
import { ensureMessagingSchema } from "@/app/actions/messaging"

export type LivreurOrder = {
  id: number
  customerName: string
  summary: string
  products: string
  total: number
  status: string
  fulfillment: string
  scheduledDate: string
  scheduledSlot: string
  address: string
  lat: number | null
  lng: number | null
  createdAt: string
}

async function canDeliver() {
  if (await isAdmin()) return true
  return (await getActor())?.role === "livreur"
}

function mapOrder(r: Record<string, unknown>): LivreurOrder {
  return {
    id: Number(r.id),
    customerName: String(r.customer_name ?? "Client"),
    summary: String(r.summary ?? ""),
    products: String(r.products ?? ""),
    total: Number(r.total ?? 0),
    status: String(r.status ?? "en_attente"),
    fulfillment: String(r.fulfillment ?? "livraison"),
    scheduledDate: String(r.scheduled_date ?? ""),
    scheduledSlot: String(r.scheduled_slot ?? ""),
    address: String(r.address ?? ""),
    lat: r.lat != null ? Number(r.lat) : null,
    lng: r.lng != null ? Number(r.lng) : null,
    createdAt: String(r.created_at ?? ""),
  }
}

export async function listLivreurOrders(): Promise<LivreurOrder[]> {
  if (!(await canDeliver())) return []
  await ensureMessagingSchema()
  const rows = await sql`
    select id, customer_name, summary, products, total, status, fulfillment,
           scheduled_date, scheduled_slot, address, lat, lng, created_at
    from order_threads
    where status not in ('discussion', 'pris_en_charge', 'ouvert', 'ferme')
    order by created_at desc
    limit 200
  `
  return (rows as Record<string, unknown>[]).map(mapOrder)
}

export async function getLivreurOrder(id: number): Promise<LivreurOrder | null> {
  if (!(await canDeliver())) return null
  if (!Number.isFinite(id)) return null
  await ensureMessagingSchema()
  const rows = await sql`
    select id, customer_name, summary, products, total, status, fulfillment,
           scheduled_date, scheduled_slot, address, lat, lng, created_at
    from order_threads
    where id = ${id}
      and status not in ('discussion', 'pris_en_charge', 'ouvert', 'ferme')
    limit 1
  `
  const row = rows[0] as Record<string, unknown> | undefined
  return row ? mapOrder(row) : null
}
