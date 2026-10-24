"use server"

import { sql } from "@/lib/db"
import { getCustomerToken, isAdmin } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { pointsForAmount } from "@/lib/loyalty"
import {
  isDiscussionStatus,
  normalizeStatus,
  statusMeta,
  VENDOR_DISCUSSION_STATUS_OPTIONS,
  VENDOR_STATUS_OPTIONS,
  type OrderStatusKey,
} from "@/lib/order-status"
import { formatScheduledLabel, type OrderTrackingState } from "@/lib/order-timeline"

export type ThreadMessage = {
  id: number
  threadId: number
  author: string
  content: string
  type: string
  createdAt: string
  clientReadAt: string | null
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
  tracking: OrderTrackingState
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
  items?: { productId: string; name?: string; quantity: number }[]
}

let schemaReady = false

export async function ensureMessagingSchema() {
  if (schemaReady) return
  await sql`alter table order_threads add column if not exists tracking jsonb not null default '{}'::jsonb`
  await sql`alter table order_threads add column if not exists loyalty_credited boolean not null default false`
  await sql`alter table order_threads add column if not exists items jsonb not null default '[]'::jsonb`
  await sql`alter table order_threads add column if not exists rating_invited_at timestamptz`
  await sql`alter table order_thread_messages add column if not exists client_read_at timestamptz`
  schemaReady = true
}

function readTracking(raw: unknown): OrderTrackingState {
  if (!raw) return {}
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === "object" ? parsed as OrderTrackingState : {}
    } catch {
      return {}
    }
  }
  if (typeof raw === "object") return raw as OrderTrackingState
  return {}
}

function mapMessage(m: any): ThreadMessage {
  return {
    id: m.id,
    threadId: m.thread_id,
    author: m.author,
    content: m.content,
    type: m.type ?? "text",
    createdAt: m.created_at,
    clientReadAt: m.client_read_at ?? null,
  }
}

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
    tracking: readTracking(r.tracking),
  }
}

function previewText(text: string): string {
  const clean = text
    .replace(/\[audio\][\s\S]*?\[\/audio\]/gi, "Message vocal")
    .replace(/\s+/g, " ")
    .trim()
  return clean.length > 80 ? `${clean.slice(0, 77)}…` : clean
}

function statusNotice(key: OrderStatusKey, pushSent: number, slot: string | null, points: number): string {
  const label = statusMeta(key).label
  let line = `Nouveau statut : ${label}.`
  switch (key) {
    case "pris_en_charge":
      line = "Ta demande a bien été reçue et est en cours de traitement."
      break
    case "ouvert":
      line = "Ta discussion est ouverte."
      break
    case "ferme":
      line = "Cette discussion a été clôturée."
      break
    case "validee":
      line = "Ta commande a été validée et prise en charge."
      break
    case "preparation":
      line = "Tes articles sont en cours de préparation."
      break
    case "pret_meetup":
      line = "Ton colis est prêt à récupérer."
      break
    case "bientot_livraison":
      line = "Ton colis sera bientôt pris en charge pour la livraison."
      break
    case "livraison":
      line = "C'est parti : ton colis est en livraison."
      break
    case "arrivee":
      line = "Le livreur est arrivé à destination. Reste joignable."
      break
    case "livree":
      line = points > 0
        ? `Commande livrée. ${points} point${points > 1 ? "s" : ""} de fidélité ajouté${points > 1 ? "s" : ""} à ton compte.`
        : "Commande livrée. Merci pour ta confiance."
      break
    case "annulee":
      line = "Ta commande a été annulée."
      break
    default:
      break
  }
  const when = slot ? `\nCréneau prévu : ${slot}` : ""
  const push = pushSent > 0
    ? "\nNotification envoyée au client."
    : "\nMessage déposé dans ce fil. Notification push non délivrée (client non abonné)."
  return `Statut : ${label}\n${line}${when}${push}`
}

async function sessionCustomer(): Promise<{ token: string; pseudo: string } | null> {
  const token = await getCustomerToken()
  if (!token) return null
  const rows = await sql`select pseudo from users where token = ${token} limit 1`
  if (!rows[0]) return null
  return { token, pseudo: String(rows[0].pseudo ?? "Client") }
}

export async function createOrderThread(
  input: NewOrderInput,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  await ensureMessagingSchema()
  const customer = await sessionCustomer()
  if (!customer) return { ok: false, error: "Connecte-toi pour passer commande." }

  const { needsVerification } = await import("@/app/actions/verification")
  if (await needsVerification(customer.token)) {
    return { ok: false, error: "Vérification d'identité requise avant la première commande." }
  }

  if (!input.summary?.trim()) return { ok: false, error: "Le panier est vide." }
  if (!input.scheduledDate || !input.scheduledSlot) {
    return { ok: false, error: "Choisis un jour et un créneau." }
  }
  if (input.fulfillment === "livraison" && !input.address?.trim()) {
    return { ok: false, error: "Indique une adresse de livraison." }
  }

  const name = customer.pseudo || input.customerName?.trim() || "Client"
  const itemsJson = JSON.stringify(
    (input.items ?? [])
      .filter((item) => item.productId && Number(item.quantity) > 0)
      .map((item) => ({
        productId: String(item.productId),
        name: (item.name ?? "").trim().slice(0, 120),
        quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
      })),
  )
  type Row = { id: number }
  const rows = (await sql`
    insert into order_threads (
      user_token, customer_name, summary, products, items, total,
      fulfillment, address, lat, lng,
      scheduled_date, scheduled_slot, status
    ) values (
      ${customer.token},
      ${name},
      ${input.summary},
      ${input.products?.trim() || null},
      ${itemsJson}::text::jsonb,
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
  if (!thread) return { ok: false, error: "Enregistrement impossible." }

  await sql`
    insert into order_thread_messages (thread_id, author, content, type)
    values (${thread.id}, 'client', ${input.summary}, 'order')
  `

  if (input.items?.length) {
    for (const item of input.items) {
      const qty = Math.max(0, Math.floor(Number(item.quantity) || 0))
      if (!item.productId || qty <= 0) continue
      try {
        await sql`
          update products
          set stock = greatest(0, stock - ${qty}), updated_at = now()
          where id = ${item.productId}
        `
      } catch {
        /* le stock reste indicatif si la ligne produit n'existe pas */
      }
    }
  }

  try {
    const { sendAdminPush } = await import("@/lib/push-send")
    await sendAdminPush("Nouvelle commande", `${name} vient de passer une commande (#${thread.id}).`)
  } catch { /* push optionnel */ }

  revalidatePath("/admin")
  revalidatePath("/compte")
  return { ok: true, id: thread.id }
}

export async function createGeneralInquiryThread(input: {
  customerName: string
  customerToken?: string
  message: string
}): Promise<{ ok: true; id: number } | { ok: false; error?: string }> {
  await ensureMessagingSchema()
  const customer = await sessionCustomer()
  if (!customer) return { ok: false, error: "Connecte-toi pour écrire." }
  const body = input.message?.trim()
  if (!body) return { ok: false }

  type Row = { id: number }
  const rows = (await sql`
    insert into order_threads (user_token, customer_name, summary, total, fulfillment, status)
    values (
      ${customer.token},
      ${customer.pseudo},
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
    const { sendAdminPush } = await import("@/lib/push-send")
    await sendAdminPush(`Nouveau message de ${customer.pseudo}`, previewText(body))
  } catch { /* push optionnel */ }

  revalidatePath("/admin")
  return { ok: true, id: thread.id }
}

export async function getThreadsForToken(token: string): Promise<OrderThread[]> {
  if (!token) return []
  const session = await getCustomerToken()
  const admin = await isAdmin()
  if (!admin && session !== token) return []
  await ensureMessagingSchema()
  const rows = await sql`
    select * from order_threads where user_token = ${token} order by updated_at desc
  `
  return rows.map(mapThread)
}

export async function getOrCreateThread(orderId: number): Promise<{ id: number; messages: ThreadMessage[] } | null> {
  const token = await getCustomerToken()
  if (!token) return null
  await ensureMessagingSchema()

  let rows = await sql`
    select * from order_threads where order_id = ${orderId} and user_token = ${token}
  `

  if (rows.length === 0) {
    const order = await sql`select total, status from orders where id = ${orderId} and user_token = ${token}`
    if (order.length === 0) return null
    rows = await sql`
      insert into order_threads (user_token, order_id, status, total, fulfillment, summary)
      values (${token}, ${orderId}, ${normalizeStatus(String(order[0].status ?? ""))}, ${order[0].total}, 'livraison', ${"Commande #" + orderId})
      returning *
    `
  }

  const thread = rows[0]
  await markClientRead(thread.id)
  const msgs = await sql`
    select * from order_thread_messages where thread_id = ${thread.id} order by created_at asc
  `

  return { id: thread.id, messages: msgs.map(mapMessage) }
}

export async function listAllThreads(): Promise<OrderThread[]> {
  if (!(await isAdmin())) return []
  await ensureMessagingSchema()
  const rows = await sql`
    select t.*, u.pseudo
    from order_threads t
    left join users u on u.token = t.user_token
    order by t.updated_at desc
    limit 200
  `
  return rows.map((r: any) => ({ ...mapThread(r), pseudo: r.pseudo }))
}

async function markClientRead(id: number) {
  await sql`update order_threads set unread_client = 0 where id = ${id}`
  await sql`
    update order_thread_messages
    set client_read_at = now()
    where thread_id = ${id}
      and author in ('vendeur', 'admin')
      and client_read_at is null
  `
}

export async function getThreadById(id: number): Promise<{ thread: OrderThread; messages: ThreadMessage[] } | null> {
  const admin = await isAdmin()
  const token = await getCustomerToken()
  if (!admin && !token) return null
  await ensureMessagingSchema()

  const threadRows = await sql`
    select t.*, u.pseudo from order_threads t
    left join users u on u.token = t.user_token
    where t.id = ${id}
    limit 1
  `
  if (!threadRows[0]) return null
  if (!admin && threadRows[0].user_token !== token) return null

  if (admin) await sql`update order_threads set unread_admin = 0 where id = ${id}`
  else await markClientRead(id)

  const msgRows = await sql`
    select * from order_thread_messages where thread_id = ${id} order by created_at asc
  `

  return {
    thread: { ...mapThread(threadRows[0]), pseudo: threadRows[0].pseudo },
    messages: msgRows.map(mapMessage),
  }
}

export const getThread = getThreadById

export async function addMessage(threadId: number, sender: "client" | "vendeur", body: string) {
  const text = body?.trim()
  if (!text) return { ok: false as const }
  await ensureMessagingSchema()

  const admin = await isAdmin()
  const token = await getCustomerToken()

  if (sender === "vendeur") {
    if (!admin) return { ok: false as const }
  } else {
    if (!token) return { ok: false as const }
    const owned = await sql`
      select id from order_threads where id = ${threadId} and user_token = ${token} limit 1
    `
    if (!owned.length) return { ok: false as const }
  }

  await sql`
    insert into order_thread_messages (thread_id, author, content)
    values (${threadId}, ${sender}, ${text})
  `
  await sql`update order_threads set updated_at = now() where id = ${threadId}`

  if (sender === "vendeur") {
    await sql`update order_threads set unread_client = unread_client + 1 where id = ${threadId}`
    try {
      type Row = { user_token: string | null }
      const rows = (await sql`select user_token from order_threads where id = ${threadId} limit 1`) as unknown as Row[]
      if (rows[0]?.user_token) {
        const { sendPushToUser } = await import("@/lib/push-send")
        await sendPushToUser(rows[0].user_token, "Nouveau message", previewText(text), "/compte")
      }
    } catch { /* push optionnel */ }
  } else {
    await sql`update order_threads set unread_admin = unread_admin + 1 where id = ${threadId}`
    try {
      const { sendAdminPush } = await import("@/lib/push-send")
      await sendAdminPush(`Message client #${threadId}`, previewText(text))
    } catch { /* optionnel */ }
  }

  revalidatePath("/admin")
  revalidatePath("/messagerie")
  revalidatePath("/compte")
  return { ok: true as const }
}

export const sendMessage = addMessage

function allowedStatus(current: string, next: string): OrderStatusKey | null {
  const key = normalizeStatus(next)
  const pool: readonly string[] = isDiscussionStatus(current)
    ? ["discussion", ...VENDOR_DISCUSSION_STATUS_OPTIONS]
    : ["en_attente", ...VENDOR_STATUS_OPTIONS]
  if (!pool.includes(key)) return null
  return key
}

const LIVREUR_STATUS = new Set<OrderStatusKey>([
  "bientot_livraison",
  "livraison",
  "arrivee",
  "livree",
  "annulee",
])

export async function updateThreadStatus(id: number, status: string, extra?: { comment?: string }) {
  const admin = await isAdmin()
  let livreur = false
  if (!admin) {
    const { getActor } = await import("@/app/actions/staff")
    livreur = (await getActor())?.role === "livreur"
  }
  if (!admin && !livreur) return { ok: false as const, error: "Non autorisé" }
  await ensureMessagingSchema()

  const rows = await sql`select * from order_threads where id = ${id} limit 1`
  const current = rows[0]
  if (!current) return { ok: false as const, error: "Commande introuvable" }

  const nextKey = allowedStatus(String(current.status ?? ""), status)
  if (!nextKey) return { ok: false as const, error: "Statut invalide" }

  if (livreur) {
    if (!LIVREUR_STATUS.has(nextKey)) {
      return { ok: false as const, error: "Tu ne peux pas poser ce statut." }
    }
    if (String(current.fulfillment ?? "") === "meetup" && nextKey !== "annulee") {
      return { ok: false as const, error: "Le retrait se gère depuis l'admin." }
    }
    if (nextKey === "annulee" && !extra?.comment?.trim()) {
      return { ok: false as const, error: "Un commentaire est obligatoire pour annuler." }
    }
  }

  const prevKey = normalizeStatus(String(current.status ?? ""))
  const tracking = readTracking(current.tracking)
  const history: Record<string, string> = {}
  for (const [key, value] of Object.entries(tracking.history ?? {})) {
    if (typeof value === "string") history[key] = value
  }
  if (!history.en_attente && current.created_at) {
    history.en_attente = new Date(current.created_at).toISOString()
  }
  if (nextKey !== prevKey) history[nextKey] = new Date().toISOString()
  const cancelReason = nextKey === "annulee" ? extra?.comment?.trim().slice(0, 500) || tracking.cancelReason || null : tracking.cancelReason
  const nextTracking: OrderTrackingState = { ...tracking, history, cancelReason }

  await sql`
    update order_threads
    set status = ${nextKey},
        tracking = ${JSON.stringify(nextTracking)}::text::jsonb,
        updated_at = now()
    where id = ${id}
  `

  let points = 0
  if (nextKey === "livree" && prevKey !== "livree" && !current.loyalty_credited && current.user_token) {
    points = pointsForAmount(Number(current.total ?? 0))
    if (points > 0) {
      await sql`
        update users set loyalty_points = loyalty_points + ${points}
        where token = ${current.user_token}
      `
    }
    await sql`update order_threads set loyalty_credited = true where id = ${id}`
  }

  if (nextKey !== prevKey) {
    const slot = isDiscussionStatus(current.status)
      ? null
      : formatScheduledLabel(current.scheduled_date, current.scheduled_slot)
    let pushSent = 0
    if (current.user_token) {
      try {
        const { sendPushToUser } = await import("@/lib/push-send")
        pushSent = await sendPushToUser(
          current.user_token,
          `Commande #${id} — ${statusMeta(nextKey).label}`,
          statusMeta(nextKey).label,
          "/compte",
        )
      } catch { /* push optionnel */ }
    }
    let notice = statusNotice(nextKey, pushSent, slot, points)
    if (nextKey === "annulee" && cancelReason) notice += `\nCommentaire : ${cancelReason}`
    await sql`
      insert into order_thread_messages (thread_id, author, content, type)
      values (${id}, 'vendeur', ${notice}, 'status')
    `
    await sql`update order_threads set unread_client = unread_client + 1, updated_at = now() where id = ${id}`
  }

  revalidatePath("/admin")
  revalidatePath("/livreur")
  revalidatePath("/livreur/tournee/[id]", "page")
  revalidatePath("/messagerie")
  revalidatePath("/compte")
  return { ok: true as const }
}

/** Livreur ou admin : prévient le client dans le fil, sans changer le statut. */
export async function notifyArrivingInMinutes(threadId: number, minutes = 5) {
  const admin = await isAdmin()
  let livreur = false
  if (!admin) {
    const { getActor } = await import("@/app/actions/staff")
    livreur = (await getActor())?.role === "livreur"
  }
  if (!admin && !livreur) return { ok: false as const, error: "Non autorisé" }
  if (!threadId || minutes < 1 || minutes > 30) return { ok: false as const, error: "Paramètres invalides." }

  await ensureMessagingSchema()
  const rows = await sql`select * from order_threads where id = ${threadId} limit 1`
  const current = rows[0]
  if (!current) return { ok: false as const, error: "Commande introuvable." }
  if (String(current.fulfillment ?? "") === "meetup") {
    return { ok: false as const, error: "Le retrait se gère depuis l'admin." }
  }
  const key = normalizeStatus(String(current.status ?? ""))
  if (key !== "livraison" && key !== "arrivee") {
    return { ok: false as const, error: "La commande n'est pas en livraison." }
  }

  const body = `Je suis à ${minutes} minute${minutes > 1 ? "s" : ""}. Reste joignable.`
  const tracking = readTracking(current.tracking)
  const arriveBy = new Date(Date.now() + minutes * 60 * 1000).toISOString()
  const nextTracking: OrderTrackingState = {
    ...tracking,
    etaMin: minutes,
    etaAt: new Date().toISOString(),
    etaArriveBy: arriveBy,
  }
  await sql`
    update order_threads
    set tracking = ${JSON.stringify(nextTracking)}::text::jsonb,
        unread_client = unread_client + 1,
        updated_at = now()
    where id = ${threadId}
  `
  await sql`
    insert into order_thread_messages (thread_id, author, content, type)
    values (${threadId}, 'vendeur', ${body}, 'text')
  `
  if (current.user_token) {
    try {
      const { sendPushToUser } = await import("@/lib/push-send")
      await sendPushToUser(current.user_token, `Commande #${threadId}`, body, "/compte")
    } catch { /* push optionnel */ }
  }
  revalidatePath("/livreur")
  revalidatePath("/livreur/tournee/[id]", "page")
  revalidatePath("/messagerie")
  revalidatePath("/compte")
  return { ok: true as const }
}

export async function deleteThread(id: number): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) return { ok: false }
  await sql`delete from order_thread_messages where thread_id = ${id}`
  await sql`delete from order_threads where id = ${id}`
  revalidatePath("/admin")
  return { ok: true }
}

/** Supprime un ou plusieurs messages écrits par l'admin (pas ceux du client). */
export async function deleteOwnMessages(ids: number[]): Promise<{ ok: boolean; deleted: number }> {
  if (!(await isAdmin())) return { ok: false, deleted: 0 }
  const clean = [...new Set(ids.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0))]
  if (!clean.length) return { ok: false, deleted: 0 }
  await ensureMessagingSchema()
  const rows = await sql`
    delete from order_thread_messages
    where id in ${sql(clean)}
      and author in ('vendeur', 'admin')
    returning id
  `
  revalidatePath("/admin")
  return { ok: true, deleted: rows.length }
}

export async function markThreadRead(id: number) {
  if (!(await isAdmin())) return
  await sql`update order_threads set unread_admin = 0 where id = ${id}`
}
