'use server'

import webpush from 'web-push'
import { sql } from '@/lib/db'
import { getCustomerToken, isAdmin } from '@/lib/auth'
import { hasAccount } from '@/lib/shop-access'

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
  if (!(await hasAccount())) return { ok: false }
  const [token, admin] = await Promise.all([getCustomerToken(), isAdmin()])

  // Ni client connecté ni admin → refus (un livreur n'abonne pas l'admin)
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
  if (!(await hasAccount())) return { ok: false }
  const [token, admin] = await Promise.all([getCustomerToken(), isAdmin()])
  if (!token && !admin) return { ok: false }
  if (admin) await sql`delete from push_subscriptions where endpoint = ${endpoint}`
  else await sql`delete from push_subscriptions where endpoint = ${endpoint} and user_token = ${token}`
  return { ok: true }
}

export async function customerHasPush(): Promise<boolean> {
  const token = await getCustomerToken()
  if (!token) return false
  const rows = await sql`select 1 from push_subscriptions where user_token = ${token} limit 1`
  return rows.length > 0
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

