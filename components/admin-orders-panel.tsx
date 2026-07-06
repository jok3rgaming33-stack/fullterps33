"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateOrderStatus } from "@/app/actions/orders"
import { formatPrice } from "@/lib/utils"

type OrderItem = { productId: string; name: string; size: string; price: number; quantity: number }

type Order = {
  id: number
  customerEmail: string | null
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
  promoCode: string | null
  status: string
  createdAt: string
}

const STATUSES = ["En préparation", "Expédiée", "Livrée", "Annulée"]

export function AdminOrdersPanel({ orders }: { orders: Order[] }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleStatusChange(orderId: number, status: string) {
    startTransition(async () => {
      await updateOrderStatus(orderId, status)
      router.refresh()
    })
  }

  if (orders.length === 0) {
    return <p className="font-mono text-sm text-ivory/40">Aucune commande pour l'instant.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {orders.map((o) => (
        <div key={o.id} className="clip-card border border-white/10 bg-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-base tracking-wide">Commande #{o.id}</p>
              <p className="font-mono text-[11px] text-ivory/40">
                {o.customerEmail ?? "Invité"} ·{" "}
                {new Date(o.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            </div>
            <select
              value={o.status}
              disabled={pending}
              onChange={(e) => handleStatusChange(o.id, e.target.value)}
              className="border border-white/15 bg-void px-3 py-1.5 font-mono text-xs uppercase tracking-wide outline-none focus:border-violet-electric disabled:opacity-60"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <ul className="mt-3 flex flex-col gap-1 border-t border-white/5 pt-3">
            {o.items.map((item, idx) => (
              <li key={idx} className="flex justify-between font-mono text-xs text-ivory/70">
                <span>
                  {item.quantity}× {item.name} ({item.size})
                </span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex justify-end gap-4 border-t border-white/5 pt-3 font-mono text-xs">
            {o.discount > 0 && (
              <span className="text-ivory/40">
                Réduction {o.promoCode ? `(${o.promoCode})` : ""} : -{formatPrice(o.discount)}
              </span>
            )}
            <span className="font-bold text-violet-electric">{formatPrice(o.total)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
