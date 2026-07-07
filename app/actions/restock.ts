"use server"

import { sql } from "@/lib/db"
import { getCustomerToken } from "@/lib/auth"
import { isAdmin } from "@/lib/auth"
import { sendPushToUser } from "@/app/actions/push"
import { revalidatePath } from "next/cache"

type RestockRow = {
  id: number
  product_id: string
  user_token: string
  notified: boolean
  created_at: string
  product_name?: string
  pseudo?: string
}

// ── Client : s'inscrire / se désinscrire d'une alerte restock ──────────────

export async function subscribeRestock(productId: string): Promise<{ ok: boolean; message: string }> {
  const token = await getCustomerToken()
  if (!token) return { ok: false, message: "Non connecté" }

  const existing = await sql`
    SELECT id FROM restock_alerts WHERE product_id = ${productId} AND user_token = ${token}
  ` as unknown as { id: number }[]

  if (existing.length > 0) {
    return { ok: false, message: "Alerte déjà active" }
  }

  await sql`
    INSERT INTO restock_alerts (product_id, user_token)
    VALUES (${productId}, ${token})
    ON CONFLICT DO NOTHING
  `
  return { ok: true, message: "Alerte activée — tu seras notifié au retour en stock" }
}

export async function unsubscribeRestock(productId: string): Promise<{ ok: boolean }> {
  const token = await getCustomerToken()
  if (!token) return { ok: false }
  await sql`DELETE FROM restock_alerts WHERE product_id = ${productId} AND user_token = ${token}`
  return { ok: true }
}

export async function getMyRestockAlerts(): Promise<{ product_id: string; product_name: string }[]> {
  const token = await getCustomerToken()
  if (!token) return []
  const rows = await sql`
    SELECT ra.product_id, p.name AS product_name
    FROM restock_alerts ra
    JOIN products p ON p.id = ra.product_id
    WHERE ra.user_token = ${token} AND ra.notified = false
    ORDER BY ra.created_at DESC
  ` as unknown as { product_id: string; product_name: string }[]
  return rows
}

export async function isSubscribedRestock(productId: string): Promise<boolean> {
  const token = await getCustomerToken()
  if (!token) return false
  const rows = await sql`
    SELECT id FROM restock_alerts WHERE product_id = ${productId} AND user_token = ${token} AND notified = false
  ` as unknown as { id: number }[]
  return rows.length > 0
}

// ── Admin : déclencher les notifications restock pour un produit ───────────

export async function triggerRestockNotifications(productId: string): Promise<{ ok: boolean; notified: number }> {
  const admin = await isAdmin()
  if (!admin) return { ok: false, notified: 0 }

  const product = await sql`SELECT name FROM products WHERE id = ${productId}` as unknown as { name: string }[]
  const productName = product[0]?.name ?? "Produit"

  const alerts = await sql`
    SELECT user_token FROM restock_alerts
    WHERE product_id = ${productId} AND notified = false
  ` as unknown as { user_token: string }[]

  let notified = 0
  for (const alert of alerts) {
    try {
      await sendPushToUser(alert.user_token, {
        title: "Retour en stock",
        body: `${productName} est de nouveau disponible — commande vite !`,
      })
      notified++
    } catch { /* push peut échouer si pas de sub active */ }
  }

  await sql`
    UPDATE restock_alerts
    SET notified = true
    WHERE product_id = ${productId} AND notified = false
  `

  revalidatePath("/")
  revalidatePath("/admin")
  return { ok: true, notified }
}

export async function listRestockAlerts(): Promise<RestockRow[]> {
  const admin = await isAdmin()
  if (!admin) return []
  const rows = await sql`
    SELECT ra.*, p.name AS product_name, u.pseudo
    FROM restock_alerts ra
    JOIN products p ON p.id = ra.product_id
    JOIN users u ON u.token = ra.user_token
    WHERE ra.notified = false
    ORDER BY ra.created_at DESC
  ` as unknown as RestockRow[]
  return rows
}
