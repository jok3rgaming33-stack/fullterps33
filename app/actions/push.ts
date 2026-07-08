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
  const token = await getCustomerToken()
  if (!token) return { ok: false }
  await sql`
    insert into push_subscriptions (user_token, endpoint, p256dh, auth)
    values (${token}, ${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth})
    on conflict (endpoint) do update set user_token = ${token}, p256dh = ${sub.keys.p256dh}, auth = ${sub.keys.auth}
  `
  return { ok: true }
}

export async function unsubscribePush(endpoint: string): Promise<{ ok: boolean }> {
  const token = await getCustomerToken()
  if (!token) return { ok: false }
  await sql`delete from push_subscriptions where endpoint = ${endpoint} and user_token = ${token}`
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
