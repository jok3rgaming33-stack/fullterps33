import webpush from "web-push"
import { sql } from "@/lib/db"

type PushRow = { endpoint: string; p256dh: string; auth: string }

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@fullterps33.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || "",
)

/** Hors fichier "use server" : pas appelable directement par un visiteur. */
export async function sendPushToUser(
  userToken: string,
  title: string,
  body: string,
  url = "/compte",
): Promise<number> {
  const rows = (await sql`select endpoint, p256dh, auth from push_subscriptions where user_token = ${userToken}`) as unknown as PushRow[]
  if (!rows.length) return 0
  const payload = JSON.stringify({ title, body, icon: "/icon-192.png", badge: "/icon-192.png", url })
  const results = await Promise.allSettled(
    rows.map((r) =>
      webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, payload),
    ),
  )
  return results.filter((r) => r.status === "fulfilled").length
}

export async function sendAdminPush(title: string, body: string): Promise<void> {
  try {
    const rows = (await sql`
      select endpoint, p256dh, auth from push_subscriptions where role = 'admin'
    `) as unknown as PushRow[]
    if (!rows.length) return
    const payload = JSON.stringify({ title, body, icon: "/icon-192.png", badge: "/icon-192.png" })
    await Promise.allSettled(
      rows.map((r) =>
        webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, payload),
      ),
    )
  } catch {
    /* push optionnel — ne bloque jamais l'action principale */
  }
}
