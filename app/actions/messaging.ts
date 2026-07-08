"use server"

import { sql } from "@/lib/db"
import { isAdmin } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { statusMeta } from "@/lib/order-status"

export type ThreadMessage = {
  id: number
  threadId: number
  author: string
  content: string
  type: string
  createdAt: string
}

export type OrderThread = {
  id: number
  userToken: string | null
  customerName: string | null
  orderId: number | null
  summary: string | null
  products: string | null
  total: number
  fulfillment: string
  address: string | null
  lat: number | null
  lng: number | null
  scheduledDate: string | null
  scheduledSlot: string | null
  status: string
  unreadAdmin: number
  unreadClient: number
  createdAt: string
  updatedAt: string
  pseudo?: string
}

export type NewOrderInput = {
  customerName: string
  customerToken?: string
  summary: string
  products?: string
  total: number
  fulfillment: "livraison" | "meetup"
  address?: string
  lat?: number | null
  lng?: number | null
  scheduledDate?: string
  scheduledSlot?: string
}

// ── Création d'un fil de commande (appelé à la validation du panier) ────────
export async function createOrderThread(input: NewOrderInput): Promise<{ id: number } | null> {
  const name = input.customerName?.trim() || "Client"

  type Row = { id: number }
  const rows = (await sql`
    insert into order_threads (
      user_token, customer_name, summary, products, total,
      fulfillment, address, lat, lng,
      scheduled_date, scheduled_slot, status
    ) values (
      ${input.customerToken?.trim() || null},
      ${name},
      ${input.summary},
      ${input.products?.trim() || null},
      ${input.total},
      ${input.fulfillment},
      ${input.address?.trim() || null},
      ${input.lat ?? null},
      ${input.lng ?? null},
      ${input.scheduledDate ?? null},
      ${input.scheduledSlot ?? null},
      'en_attente'
    ) returning id
  `) as unknown as Row[]

  const thread = rows[0]
  if (!thread) return null

  await sql`
    insert into order_thread_messages (thread_id, author, content, type)
    values (${thread.id}, 'client', ${input.summary}, 'order')
  `

  try {
    const { sendAdminPush } = await import("@/app/actions/push")
    await sendAdminPush("Nouvelle commande", `${name} vient de passer une commande (#${thread.id}).`)
  } catch { /* push optionnel */ }

  revalidatePath("/admin")
  return { id: thread.id }
}

// ── Fil de discussion générale (contact sans commande) ─────────────────────
export async function createGeneralInquiryThread(input: {
  customerName: string
  customerToken?: string
  message: string
}): Promise<{ ok: true; id: number } | { ok: false }> {
  const name = input.customerName?.trim() || "Client"
  const body = input.message?.trim()
  if (!body) return { ok: false }

  type Row = { id: number }
  const rows = (await sql`
    insert into order_threads (user_token, customer_name, summary, total, fulfillment, status)
    values (
      ${input.customerToken?.trim() || null},
      ${name},
      'Discussion générale',
      0,
      'livraison',
      'discussion'
    ) returning id
  `) as unknown as Row[]

  const thread = rows[0]
  if (!thread) return { ok: false }

  await sql`
    insert into order_thread_messages (thread_id, author, content)
    values (${thread.id}, 'client', ${body})
  `

  try {
    const { sendAdminPush } = await import("@/app/actions/push")
    await sendAdminPush(`Nouveau message de ${name}`, body.length > 80 ? `${body.slice(0, 77)}…` : body)
  } catch { /* push optionnel */ }

  revalidatePath("/admin")
  return { ok: true, id: thread.id }
}

// ── Fils d'un client (par token) ───────────────────────────────────────────
export async function getThreadsForToken(token: string): Promise<OrderThread[]> {
  if (!token) return []
  const rows = await sql`
    select * from order_threads where user_token = ${token} order by updated_at desc
  `
  return rows.map(mapThread)
}

// ── Crée ou récupère le fil d'une commande existante (client connecté) ─────
export async function getOrCreateThread(orderId: number): Promise<{ id: number; messages: ThreadMessage[] } | null> {
  const { getCustomerToken } = await import("@/lib/auth")
  const token = await getCustomerToken()
  if (!token) return null

  let rows = await sql`
    select * from order_threads where order_id = ${orderId} and user_token = ${token}
  `

  if (rows.length === 0) {
    const order = await sql`select total, status from orders where id = ${orderId} and user_token = ${token}`
    if (order.length === 0) return null
    rows = await sql`
      insert into order_threads (user_token, order_id, status, total, fulfillment, summary)
      values (${token}, ${orderId}, ${order[0].status}, ${order[0].total}, 'livraison', ${'Commande #' + orderId})
      returning *
    `
  }

  const thread = rows[0]
  const msgs = await sql`
    select * from order_thread_messages where thread_id = ${thread.id} order by created_at asc
  `
  await sql`update order_threads set unread_client = 0 where id = ${thread.id}`

  return {
    id: thread.id,
    messages: msgs.map((m: any) => ({
      id: m.id,
      threadId: m.thread_id,
      author: m.author,
      content: m.content,
      type: m.type ?? "text",
      createdAt: m.created_at,
    })),
  }
}

// ── Tous les fils (admin) ──────────────────────────────────────────────────
export async function listAllThreads(): Promise<OrderThread[]> {
  if (!(await isAdmin())) return []
  const rows = await sql`
    select t.*, u.pseudo
    from order_threads t
    left join users u on u.token = t.user_token
    order by t.updated_at desc
    limit 200
  `
  return rows.map((r: any) => ({ ...mapThread(r), pseudo: r.pseudo }))
}

// ── Détail d'un fil avec messages ─────────────────────────────────────────
export async function getThreadById(id: number): Promise<{ thread: OrderThread; messages: ThreadMessage[] } | null> {
  const admin = await isAdmin()
  const { getCustomerToken } = await import("@/lib/auth")
  const token = await getCustomerToken()
  if (!admin && !token) return null

  const threadRows = await sql`
    select t.*, u.pseudo from order_threads t
    left join users u on u.token = t.user_token
    where t.id = ${id}
    limit 1
  `
  if (!threadRows[0]) return null

  // Vérifier l'accès si client
  if (!admin && threadRows[0].user_token !== token) return null

  const msgRows = await sql`
    select * from order_thread_messages where thread_id = ${id} order by created_at asc
  `

  if (admin) await sql`update order_threads set unread_admin = 0 where id = ${id}`
  else       await sql`update order_threads set unread_client = 0 where id = ${id}`

  return {
    thread: { ...mapThread(threadRows[0]), pseudo: threadRows[0].pseudo },
    messages: msgRows.map((m: any) => ({
      id: m.id,
      threadId: m.thread_id,
      author: m.author,
      content: m.content,
      type: m.type ?? "text",
      createdAt: m.created_at,
    })),
  }
}

// Alias BB33
export const getThread = getThreadById

// ── Ajoute un message ─────────────────────────────────────────────────────
export async function addMessage(threadId: number, sender: "client" | "vendeur", body: string) {
  const text = body?.trim()
  if (!text) return { ok: false }

  await sql`
    insert into order_thread_messages (thread_id, author, content)
    values (${threadId}, ${sender}, ${text})
  `
  await sql`update order_threads set updated_at = now() where id = ${threadId}`

  if (sender === "vendeur") {
    await sql`update order_threads set unread_client = unread_client + 1 where id = ${threadId}`
    try {
      type Row = { user_token: string }
      const rows = (await sql`select user_token from order_threads where id = ${threadId} limit 1`) as unknown as Row[]
      if (rows[0]?.user_token) {
        const { sendPushToUser } = await import("@/app/actions/push")
        await sendPushToUser(rows[0].user_token, "Nouveau message", `Le vendeur a répondu à votre commande #${threadId}`)
      }
    } catch { /* push optionnel */ }
  } else {
    await sql`update order_threads set unread_admin = unread_admin + 1 where id = ${threadId}`
    // Notification admin — nouveau message client
    try {
      const { sendAdminPush } = await import("@/app/actions/push")
      const preview = text.length > 80 ? `${text.slice(0, 77)}…` : text
      await sendAdminPush(`Message client #${threadId}`, preview)
    } catch { /* optionnel */ }
  }

  revalidatePath("/admin")
  revalidatePath("/messagerie")
  return { ok: true }
}

// Alias pour compatibilité
export const sendMessage = addMessage

// ── Changer le statut d'un fil (admin) ────────────────────────────────────
export async function updateThreadStatus(id: number, status: string) {
  if (!(await isAdmin())) return { ok: false }

  await sql`update order_threads set status = ${status}, updated_at = now() where id = ${id}`

  const meta = statusMeta(status)
  try {
    type Row = { user_token: string }
    const rows = (await sql`select user_token from order_threads where id = ${id} limit 1`) as unknown as Row[]
    if (rows[0]?.user_token) {
      const { sendPushToUser } = await import("@/app/actions/push")
      await sendPushToUser(rows[0].user_token, `Commande #${id}`, `Statut mis à jour : ${meta.label}`)
    }
  } catch { /* push optionnel */ }

  revalidatePath("/admin")
  revalidatePath("/messagerie")
  return { ok: true }
}

// ── Supprimer un fil (admin) ───────────────────────────────────────────────
export async function deleteThread(id: number): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) return { ok: false }
  await sql`delete from order_thread_messages where thread_id = ${id}`
  await sql`delete from order_threads where id = ${id}`
  revalidatePath("/admin")
  return { ok: true }
}

// ── Marquer lu (admin) ─────────────────────────────────────────────────────
export async function markThreadRead(id: number) {
  if (!(await isAdmin())) return
  await sql`update order_threads set unread_admin = 0 where id = ${id}`
}

// ── Helper ─────────────────────────────────────────────────────────────────
function mapThread(r: any): OrderThread {
  return {
    id: r.id,
    userToken: r.user_token,
    customerName: r.customer_name,
    orderId: r.order_id ?? null,
    summary: r.summary,
    products: r.products,
    total: Number(r.total ?? 0),
    fulfillment: r.fulfillment ?? "livraison",
    address: r.address,
    lat: r.lat != null ? Number(r.lat) : null,
    lng: r.lng != null ? Number(r.lng) : null,
    scheduledDate: r.scheduled_date,
    scheduledSlot: r.scheduled_slot,
    status: r.status,
    unreadAdmin: Number(r.unread_admin ?? 0),
    unreadClient: Number(r.unread_client ?? 0),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}
