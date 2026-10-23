"use client"

import { subscribePush } from "@/app/actions/push"

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export async function deviceHasPushSubscription(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false
  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  return Boolean(existing)
}

/** Demande la permission et enregistre l'abonnement push du client connecté. */
export async function enableCustomerPush(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, error: "Ce navigateur ne prend pas en charge les notifications." }
  }
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) return { ok: false, error: "Notifications indisponibles pour le moment." }

  const permission = await Notification.requestPermission()
  if (permission !== "granted") return { ok: false, error: "Permission refusée." }

  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
  })
  const json = sub.toJSON() as { endpoint: string; keys?: { p256dh?: string; auth?: string } }
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    return { ok: false, error: "Abonnement incomplet." }
  }
  const saved = await subscribePush({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  })
  if (!saved.ok) return { ok: false, error: "Enregistrement serveur impossible." }
  return { ok: true }
}
