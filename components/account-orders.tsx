"use client"

import { useState } from "react"
import { MessageSquare } from "lucide-react"
import { OrderThreadModal } from "@/components/order-thread-modal"
import { statusMeta } from "@/lib/order-status"
import { formatPrice } from "@/lib/utils"

type Order = {
  id: number
  items: any[]
  total: number
  status: string
  createdAt: string
}

export function AccountOrders({ orders }: { orders: Order[] }) {
  const [threadOrderId, setThreadOrderId] = useState<number | null>(null)

  if (orders.length === 0) {
    return <p className="font-mono text-sm text-ivory/40">Aucune commande pour l&apos;instant.</p>
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {orders.map((o) => {
          const meta = statusMeta(o.status)
          return (
            <li key={o.id} className="border border-white/10 bg-surface px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-ivory">Commande #{o.id}</p>
                  <p className="font-mono text-[11px] text-ivory/40">
                    {new Date(o.createdAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold">{formatPrice(o.total)}</span>
                  <span className={`clip-tag px-3 py-1 font-mono text-[10px] uppercase tracking-wide ring-1 ${meta.bg} ${meta.color} ${meta.ring}`}>
                    {meta.label}
                  </span>
                  <button
                    onClick={() => setThreadOrderId(o.id)}
                    className="flex h-8 w-8 items-center justify-center border border-white/10 text-ivory/40 transition hover:border-violet-electric/40 hover:text-violet-electric"
                    title="Contacter / Suivre"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {threadOrderId !== null && (
        <OrderThreadModal
          orderId={threadOrderId}
          onClose={() => setThreadOrderId(null)}
        />
      )}
    </>
  )
}
