"use server"

import { sql } from '@/lib/db'
import { getCustomerToken, isAdmin } from "@/lib/auth"
import { pointsForAmount } from "@/lib/loyalty"
import { validatePromoCode } from "@/app/actions/promo"
import { getVerificationStatus } from "@/app/actions/verification"
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

  // Vérifier KYC
  const verification = await getVerificationStatus()
  if (!verification || verification.status !== 'validated') {
    return { ok: false, message: "Vérification d'identité requise pour finaliser la commande" }
  }

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
  const userToken = await getCustomerToken()

  const inserted = await sql`
    insert into orders (user_token, items, subtotal, discount, total, promo_code, status)
    values (${userToken}, ${JSON.stringify(items)}, ${subtotal}, ${discount}, ${total}, ${appliedCode}, 'En préparation')
    returning id
  `

  if (userToken) {
    const points = pointsForAmount(total)
    await sql`update users set loyalty_points = loyalty_points + ${points} where token = ${userToken}`
  }

  revalidatePath("/compte")
  revalidatePath("/admin")
  return { ok: true, message: "Commande passée", orderId: inserted[0].id }
}

export async function listMyOrders() {
  const userToken = await getCustomerToken()
  if (!userToken) return []
  const rows = await sql`
    select id, items, total, status, created_at from orders
    where user_token = ${userToken}
    order by created_at desc
  `
  return rows.map((r: any) => ({
    id: r.id,
    items: typeof r.items === "string" ? JSON.parse(r.items) : (r.items ?? []),
    total: r.total,
    status: r.status,
    createdAt: r.created_at,
  }))
}

export async function listAllOrders() {
  if (!await isAdmin()) throw new Error("Non autorisé")
  // Les vraies commandes sont dans order_threads (créées par createOrderThread dans checkout-cart)
  const rows = await sql`
    select id, customer_name, summary, products, total, status, fulfillment,
           scheduled_date, scheduled_slot, address, created_at
    from order_threads
    order by created_at desc
    limit 200
  `
  return rows.map((r: any) => ({
    id:            r.id,
    ref:           `FT-${String(r.id).padStart(4, "0")}`,
    customerName:  r.customer_name ?? "Membre",
    summary:       r.summary ?? "",
    products:      r.products ?? "",
    total:         Number(r.total ?? 0),
    status:        r.status ?? "en_attente",
    fulfillment:   r.fulfillment ?? "",
    scheduledDate: r.scheduled_date ?? "",
    scheduledSlot: r.scheduled_slot ?? "",
    address:       r.address ?? "",
    createdAt:     r.created_at,
  }))
}

const STATUSES = ["en_attente", "confirmee", "en_route", "livree", "annulee"] as const

export async function updateOrderStatus(orderId: number, status: string) {
  if (!await isAdmin()) throw new Error("Non autorisé")
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
    throw new Error("Statut invalide")
  }
  await sql`update order_threads set status = ${status} where id = ${orderId}`
  revalidatePath("/admin")
  revalidatePath("/compte")
}

export async function deleteOrder(orderId: number): Promise<{ ok: boolean }> {
  if (!await isAdmin()) return { ok: false }
  await sql`delete from order_threads where id = ${orderId}`
  revalidatePath("/admin")
  revalidatePath("/compte")
  return { ok: true }
}
