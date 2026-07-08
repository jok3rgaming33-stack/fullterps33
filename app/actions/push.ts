'use server'

import webpush from 'web-push'
import { sql } from '@/lib/db'
import { getCustomerToken, isAdmin } from '@/lib/auth'

type PushRow = { endpoint: string; p256dh: string; auth: string }

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@fullterps33.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
)

export async function subscribePush(sub: {
  endpoint: string
  keys: { p256dh: string; auth: string }
}): Promise<{ ok: boolean }> {
  const [token, admin] = await Promise.all([getCustomerToken(), isAdmin()])

  // Ni client connecté ni admin → refus
  if (!token && !admin) return { ok: false }

  const userToken = token ?? 'admin'
  const role = admin ? 'admin' : 'customer'

  await sql`
    insert into push_subscriptions (user_token, endpoint, p256dh, auth, role)
    values (${userToken}, ${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth}, ${role})
    on conflict (endpoint) do update
      set user_token = ${userToken},
          p256dh     = ${sub.keys.p256dh},
          auth       = ${sub.keys.auth},
          role       = ${role}
  `
  return { ok: true }
}

export async function unsubscribePush(endpoint: string): Promise<{ ok: boolean }> {
  const [token, admin] = await Promise.all([getCustomerToken(), isAdmin()])
  if (!token && !admin) return { ok: false }
  await sql`delete from push_subscriptions where endpoint = ${endpoint}`
  return { ok: true }
}

export async function sendPushToUser(userToken: string, title: string, body: string): Promise<void> {
  const rows = (await sql`select endpoint, p256dh, auth from push_subscriptions where user_token = ${userToken}`) as unknown as PushRow[]
  const payload = JSON.stringify({ title, body, icon: '/icon-192.png', badge: '/icon-192.png' })
  await Promise.allSettled(
    rows.map((r) =>
      webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, payload)
    )
  )
}

export async function broadcastPush(title: string, body: string): Promise<{ ok: boolean; sent: number }> {
  const admin = await isAdmin()
  if (!admin) return { ok: false, sent: 0 }
  const rows = (await sql`select endpoint, p256dh, auth from push_subscriptions`) as unknown as PushRow[]
  const payload = JSON.stringify({ title, body, icon: '/icon-192.png', badge: '/icon-192.png' })
  const results = await Promise.allSettled(
    rows.map((r) =>
      webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, payload)
    )
  )
  const sent = results.filter((r) => r.status === 'fulfilled').length
  return { ok: true, sent }
}

/**
 * Envoie une notification push uniquement aux abonnés admin (role = 'admin').
 * Appelé depuis les server actions sans vérification isAdmin() car c'est une action système.
 */
export async function sendAdminPush(title: string, body: string): Promise<void> {
  try {
    const rows = (await sql`
      select endpoint, p256dh, auth from push_subscriptions where role = 'admin'
    `) as unknown as PushRow[]
    if (!rows.length) return
    const payload = JSON.stringify({ title, body, icon: '/icon-192.png', badge: '/icon-192.png' })
    await Promise.allSettled(
      rows.map((r) =>
        webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, payload)
      )
    )
  } catch { /* push optionnel — ne bloque jamais l'action principale */ }
}
