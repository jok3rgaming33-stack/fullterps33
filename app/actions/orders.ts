"use server"

import { sql } from "@/lib/db"
import { getCustomerId, isAdmin } from "@/lib/auth"
import { pointsForAmount } from "@/lib/loyalty"
import { validatePromoCode } from "@/app/actions/promo"
import { revalidatePath } from "next/cache"

export type OrderItemInput = {
  productId: string
  name: string
  size: string
  price: number
  quantity: number
}

export type PlaceOrderResult = { ok: boolean; message: string; orderId?: number }

export async function placeOrder(items: OrderItemInput[], promoCode?: string): Promise<PlaceOrderResult> {
  if (items.length === 0) return { ok: false, message: "Le panier est vide" }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  let discount = 0
  let appliedCode: string | null = null

  if (promoCode) {
    const promo = await validatePromoCode(promoCode, subtotal)
    if (!promo.ok) return { ok: false, message: promo.message }
    discount = promo.discount ?? 0
    appliedCode = promo.code ?? null
  }

  const total = Math.max(0, subtotal - discount)
  const customerId = getCustomerId()

  let customerEmail: string | null = null
  if (customerId) {
    const rows = await sql`select email from customers where id = ${customerId}`
    customerEmail = rows[0]?.email ?? null
  }

  const inserted = await sql`
    insert into orders (customer_id, customer_email, items, subtotal, discount, total, promo_code, status)
    values (${customerId}, ${customerEmail}, ${JSON.stringify(items)}, ${subtotal}, ${discount}, ${total}, ${appliedCode}, 'En préparation')
    returning id
  `

  if (customerId) {
    const points = pointsForAmount(total)
    await sql`update customers set loyalty_points = loyalty_points + ${points} where id = ${customerId}`
  }

  revalidatePath("/compte")
  revalidatePath("/admin")
  return { ok: true, message: "Commande passée", orderId: inserted[0].id }
}

export async function listMyOrders() {
  const customerId = getCustomerId()
  if (!customerId) return []
  const rows = await sql`
    select id, items, total, status, created_at from orders
    where customer_id = ${customerId}
    order by created_at desc
  `
  return rows.map((r: any) => ({
    id: r.id,
    items: r.items,
    total: r.total,
    status: r.status,
    createdAt: r.created_at,
  }))
}

export async function listAllOrders() {
  if (!isAdmin()) throw new Error("Non autorisé")
  const rows = await sql`select * from orders order by created_at desc limit 200`
  return rows.map((r: any) => ({
    id: r.id,
    customerEmail: r.customer_email,
    items: r.items,
    subtotal: r.subtotal,
    discount: r.discount,
    total: r.total,
    promoCode: r.promo_code,
    status: r.status,
    createdAt: r.created_at,
  }))
}

const STATUSES = ["En préparation", "Expédiée", "Livrée", "Annulée"] as const

export async function updateOrderStatus(orderId: number, status: string) {
  if (!isAdmin()) throw new Error("Non autorisé")
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
    throw new Error("Statut invalide")
  }
  await sql`update orders set status = ${status} where id = ${orderId}`
  revalidatePath("/admin")
  revalidatePath("/compte")
}
