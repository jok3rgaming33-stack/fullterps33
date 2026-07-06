"use client"

import { useState } from "react"
import type { Product } from "@/lib/types"
import type { PromoCode } from "@/app/actions/promo"
import { AdminProductsPanel } from "@/components/admin-products-panel"
import { AdminPromosPanel } from "@/components/admin-promos-panel"
import { AdminOrdersPanel } from "@/components/admin-orders-panel"
import { adminLogout } from "@/app/actions/admin-auth"
import { useRouter } from "next/navigation"

type Order = Parameters<typeof AdminOrdersPanel>[0]["orders"]

const TABS = ["Produits", "Codes promo", "Commandes"] as const

export function AdminTabs({
  products,
  promos,
  orders,
}: {
  products: Product[]
  promos: PromoCode[]
  orders: Order
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Produits")
  const router = useRouter()

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-16">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-wide text-ivory">Panel Admin</h1>
        <button
          onClick={() =>
            adminLogout().then(() => {
              router.push("/")
              router.refresh()
            })
          }
          className="border border-white/20 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-ivory/70 hover:border-signal hover:text-signal"
        >
          Se déconnecter
        </button>
      </div>

      <div className="mb-8 flex gap-1 border-b border-white/10">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-widest transition ${
              tab === t
                ? "border-b-2 border-violet-electric text-violet-electric"
                : "text-ivory/50 hover:text-ivory"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Produits" && <AdminProductsPanel products={products} />}
      {tab === "Codes promo" && <AdminPromosPanel promos={promos} />}
      {tab === "Commandes" && <AdminOrdersPanel orders={orders} />}
    </div>
  )
}
