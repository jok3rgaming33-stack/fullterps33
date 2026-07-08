import { sql } from "@/lib/db"
import { RapportClient } from "./rapport-client"

export const dynamic = "force-dynamic"

async function getStats() {
  const [users, orders, products, promos, verifs, messages, tiers, revenue] = await Promise.all([
    sql`SELECT COUNT(*) AS n FROM users`,
    sql`SELECT COUNT(*) AS n FROM order_threads`,
    sql`SELECT COUNT(*) AS n FROM products WHERE active = true`,
    sql`SELECT COUNT(*) AS n FROM promo_codes WHERE active = true`,
    sql`SELECT COUNT(*) AS n FROM user_verifications`,
    sql`SELECT COUNT(*) AS n FROM order_thread_messages`,
    sql`SELECT COUNT(*) AS n FROM loyalty_tiers`,
    sql`SELECT COALESCE(SUM(total_amount),0) AS total FROM order_threads WHERE status != 'annulee'`,
  ])
  return {
    users:    Number((users as any[])[0].n),
    orders:   Number((orders as any[])[0].n),
    products: Number((products as any[])[0].n),
    promos:   Number((promos as any[])[0].n),
    verifs:   Number((verifs as any[])[0].n),
    messages: Number((messages as any[])[0].n),
    tiers:    Number((tiers as any[])[0].n),
    revenue:  Number((revenue as any[])[0].total),
  }
}

export default async function RapportPage() {
  const stats = await getStats()
  const date = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  })
  return <RapportClient stats={stats} date={date} />
}
