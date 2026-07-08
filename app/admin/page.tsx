import { isAdmin } from "@/lib/auth"
import { AdminLoginForm } from "@/components/admin-login-form"
import { AdminDashboard } from "@/components/admin-dashboard"
import { listProducts } from "@/app/actions/products"
import { listPromoCodes } from "@/app/actions/promo"
import { listAllOrders } from "@/app/actions/orders"
import { listAdminUsers } from "@/app/actions/account"
import { listAllThreads } from "@/app/actions/messaging"
import { getAllSettings, listNews, getCartConfig, getShopSections } from "@/app/actions/settings"
import { listPendingVerifications } from "@/app/actions/verification"
import { getLoyaltyTiers } from "@/app/actions/loyalty"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const admin = await isAdmin()
  if (!admin) return <AdminLoginForm />

  const [products, promos, orders, users, threads, appSettings, news, cartConfig, verifications, sections, loyaltyTiers, rewardCodeRows] = await Promise.all([
    listProducts(),
    listPromoCodes(),
    listAllOrders(),
    listAdminUsers(),
    listAllThreads(),
    getAllSettings(),
    listNews(),
    getCartConfig(),
    listPendingVerifications(),
    getShopSections(),
    getLoyaltyTiers(),
    sql`
      SELECT pc.code, pc.value as discount_euros, lt.label,
             pc.issued_to_token, pc.used_by_token, pc.active, pc.created_at
      FROM promo_codes pc
      LEFT JOIN loyalty_tiers lt ON lt.id = pc.reward_tier_id
      WHERE pc.is_loyalty_reward = true
      ORDER BY pc.created_at DESC
      LIMIT 100
    `,
  ])

  const rewardCodes = (rewardCodeRows as any[]).map((r) => ({
    code:          r.code,
    discountEuros: r.discount_euros,
    label:         r.label ?? "—",
    issuedTo:      r.issued_to_token,
    usedBy:        r.used_by_token,
    active:        r.active,
    createdAt:     r.created_at,
  }))

  return (
    <AdminDashboard
      products={products}
      promos={promos}
      orders={orders}
      users={users}
      threads={threads}
      appSettings={appSettings}
      news={news}
      cartConfig={cartConfig}
      verifications={verifications}
      sections={sections}
      loyaltyTiers={loyaltyTiers}
      rewardCodes={rewardCodes}
    />
  )
}
