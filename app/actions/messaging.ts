"use server"

import { sql } from "@/lib/db"
import { getCustomerToken, isAdmin } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export type ThreadMessage = {
  id: number
  author: "client" | "admin"
  content: string
  type: string
  createdAt: string
}

export type OrderThread = {
  id: number
  orderId: number | null
  userToken: string
  status: string
  deliveryMode: string | null
  deliveryDate: string | null
  deliverySlot: string | null
  deliveryAddress: string | null
  total: number | null
  unreadAdmin: number
  unreadClient: number
  createdAt: string
  updatedAt: string
  messages: ThreadMessage[]
  pseudo?: string
}

// Crée ou récupère le fil pour une commande
export async function getOrCreateThread(orderId: number): Promise<OrderThread | null> {
  const token = await getCustomerToken()
  if (!token) return null

  // Cherche un fil existant
  let rows = await sql`
    select * from order_threads where order_id = ${orderId} and user_token = ${token}
  `

  if (rows.length === 0) {
    // Récupère infos de la commande
    const order = await sql`select total, status from orders where id = ${orderId} and user_token = ${token}`
    if (order.length === 0) return null

    rows = await sql`
      insert into order_threads (user_token, order_id, status, total)
      values (${token}, ${orderId}, ${order[0].status}, ${order[0].total})
      returning *
    `
  }

  const thread = rows[0]
  const msgs = await sql`
    select * from order_thread_messages where thread_id = ${thread.id} order by created_at asc
  `

  // Marque lu côté client
  await sql`update order_threads set unread_client = 0 where id = ${thread.id}`

  return {
    id: thread.id,
    orderId: thread.order_id,
    userToken: thread.user_token,
    status: thread.status,
    deliveryMode: thread.delivery_mode,
    deliveryDate: thread.delivery_date,
    deliverySlot: thread.delivery_slot,
    deliveryAddress: thread.delivery_address,
    total: thread.total,
    unreadAdmin: thread.unread_admin,
    unreadClient: thread.unread_client,
    createdAt: thread.created_at,
    updatedAt: thread.updated_at,
    messages: msgs.map((m: any) => ({
      id: m.id,
      author: m.author,
      content: m.content,
      type: m.type,
      createdAt: m.created_at,
    })),
  }
}

// Envoie un message (client ou admin)
export async function sendMessage(threadId: number, content: string): Promise<{ ok: boolean }> {
  const token = await getCustomerToken()
  const admin = await isAdmin()
  if (!token && !admin) return { ok: false }

  const author = admin ? "admin" : "client"
  const trimmed = content.trim()
  if (!trimmed) return { ok: false }

  await sql`
    insert into order_thread_messages (thread_id, author, content)
    values (${threadId}, ${author}, ${trimmed})
  `

  // Incrémenter unread de l'autre côté
  if (admin) {
    await sql`update order_threads set unread_client = unread_client + 1, updated_at = now() where id = ${threadId}`
  } else {
    await sql`update order_threads set unread_admin = unread_admin + 1, updated_at = now() where id = ${threadId}`
  }

  revalidatePath("/compte")
  revalidatePath("/admin")
  return { ok: true }
}

// Liste tous les fils (admin)
export async function listAllThreads(): Promise<OrderThread[]> {
  if (!await isAdmin()) return []
  const rows = await sql`
    select t.*, u.pseudo
    from order_threads t
    left join users u on u.token = t.user_token
    order by t.updated_at desc
    limit 100
  `
  return rows.map((r: any) => ({
    id: r.id,
    orderId: r.order_id,
    userToken: r.user_token,
    pseudo: r.pseudo,
    status: r.status,
    deliveryMode: r.delivery_mode,
    deliveryDate: r.delivery_date,
    deliverySlot: r.delivery_slot,
    deliveryAddress: r.delivery_address,
    total: r.total,
    unreadAdmin: r.unread_admin,
    unreadClient: r.unread_client,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    messages: [],
  }))
}

// Récupère un fil avec ses messages (admin)
export async function getThreadById(threadId: number): Promise<OrderThread | null> {
  if (!await isAdmin()) return null
  const rows = await sql`
    select t.*, u.pseudo from order_threads t
    left join users u on u.token = t.user_token
    where t.id = ${threadId}
  `
  if (rows.length === 0) return null
  const thread = rows[0]

  const msgs = await sql`
    select * from order_thread_messages where thread_id = ${threadId} order by created_at asc
  `

  await sql`update order_threads set unread_admin = 0 where id = ${threadId}`

  return {
    id: thread.id,
    orderId: thread.order_id,
    pseudo: thread.pseudo,
    userToken: thread.user_token,
    status: thread.status,
    deliveryMode: thread.delivery_mode,
    deliveryDate: thread.delivery_date,
    deliverySlot: thread.delivery_slot,
    deliveryAddress: thread.delivery_address,
    total: thread.total,
    unreadAdmin: thread.unread_admin,
    unreadClient: thread.unread_client,
    createdAt: thread.created_at,
    updatedAt: thread.updated_at,
    messages: msgs.map((m: any) => ({
      id: m.id,
      author: m.author,
      content: m.content,
      type: m.type,
      createdAt: m.created_at,
    })),
  }
}
