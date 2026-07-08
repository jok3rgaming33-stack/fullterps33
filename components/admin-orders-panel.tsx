"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateOrderStatus, deleteOrder } from "@/app/actions/orders"
import { Trash2 } from "lucide-react"
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

export function AdminOrdersPanel({ orders: initialOrders }: { orders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [pending, startTransition] = useTransition()
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const router = useRouter()

  function handleStatusChange(orderId: number, status: string) {
    startTransition(async () => {
      await updateOrderStatus(orderId, status)
      router.refresh()
    })
  }

  function handleDelete(orderId: number) {
    startTransition(async () => {
      const r = await deleteOrder(orderId)
      if (r.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId))
      }
      setConfirmId(null)
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
            <div className="flex items-center gap-2">
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
              {confirmId === o.id ? (
                <div className="flex items-center gap-1">
                  <button
                    disabled={pending}
                    onClick={() => handleDelete(o.id)}
                    className="border border-signal/40 bg-signal/10 px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest text-signal transition hover:bg-signal/20 disabled:opacity-40"
                  >
                    Confirmer
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="border border-white/10 px-2 py-1.5 font-mono text-[10px] text-ivory/40 transition hover:text-ivory"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(o.id)}
                  disabled={pending}
                  className="border border-white/10 p-1.5 text-ivory/30 transition hover:border-signal/30 hover:text-signal disabled:opacity-40"
                  aria-label="Supprimer la commande"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
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
