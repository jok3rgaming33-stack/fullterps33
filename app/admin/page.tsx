import { isAdmin } from "@/lib/auth"
import { AdminLoginForm } from "@/components/admin-login-form"
import { AdminDashboard } from "@/components/admin-dashboard"
import { listProducts } from "@/app/actions/products"
import { listPromoCodes } from "@/app/actions/promo"
import { listAllOrders } from "@/app/actions/orders"
import { listAdminUsers } from "@/app/actions/account"
import { listAllThreads } from "@/app/actions/messaging"
import { getAllSettings, listNews, getCartConfig } from "@/app/actions/settings"
import { listPendingVerifications } from "@/app/actions/verification"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const admin = await isAdmin()
  if (!admin) return <AdminLoginForm />

  const [products, promos, orders, users, threads, appSettings, news, cartConfig, verifications] = await Promise.all([
    listProducts(),
    listPromoCodes(),
    listAllOrders(),
    listAdminUsers(),
    listAllThreads(),
    getAllSettings(),
    listNews(),
    getCartConfig(),
    listPendingVerifications(),
  ])

  return (
    <AdminDashboard
      products={products}
      promos={promos}
      orders={orders as any}
      users={users}
      threads={threads}
      appSettings={appSettings}
      news={news}
      cartConfig={cartConfig}
      verifications={verifications}
    />
  )
}
