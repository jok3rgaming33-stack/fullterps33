import { isAdmin } from "@/lib/auth"
import { AdminLoginForm } from "@/components/admin-login-form"
import { AdminTabs } from "@/components/admin-tabs"
import { listProducts } from "@/app/actions/products"
import { listPromoCodes } from "@/app/actions/promo"
import { listAllOrders } from "@/app/actions/orders"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  if (!isAdmin()) {
    return <AdminLoginForm />
  }

  const [products, promos, orders] = await Promise.all([
    listProducts(),
    listPromoCodes(),
    listAllOrders(),
  ])

  return <AdminTabs products={products} promos={promos} orders={orders as any} />
}
