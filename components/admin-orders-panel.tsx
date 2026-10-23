"use client"

import { useState, useTransition } from "react"
import { updateOrderStatus, deleteOrder } from "@/app/actions/orders"
import { Trash2, Package, MapPin, Calendar } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import { fulfillmentLabel, isDiscussionStatus, normalizeStatus, statusMeta, statusOptionsFor } from "@/lib/order-status"
import { formatScheduledLabel } from "@/lib/order-timeline"
import { OrderTrackingCard } from "@/components/order-tracking-card"

type Order = {
  id: number
  ref: string
  customerName: string
  summary: string
  products: string
  total: number
  status: string
  fulfillment: string
  scheduledDate: string
  scheduledSlot: string
  address: string
  createdAt: string
  tracking?: { history?: Record<string, string> }
}

export function AdminOrdersPanel({ orders: initialOrders }: { orders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [pending, startTransition] = useTransition()
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [notedId, setNotedId] = useState<number | null>(null)

  function handleStatusChange(orderId: number, status: string) {
    const previous = orders.find((o) => o.id === orderId)?.status
    startTransition(async () => {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
      try {
        await updateOrderStatus(orderId, status)
        setNotedId(orderId)
      } catch {
        if (previous) setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: previous } : o))
      }
    })
  }

  function handleDelete(orderId: number) {
    startTransition(async () => {
      const r = await deleteOrder(orderId)
      if (r.ok) {
        setOrders(prev => prev.filter(o => o.id !== orderId))
      }
      setConfirmId(null)
    })
  }

  if (orders.length === 0) {
    return (
      <div className="border border-white/10 bg-surface/40 p-10 text-center">
        <Package className="mx-auto mb-3 h-8 w-8 text-violet-electric/30" />
        <p className="font-mono text-sm text-ivory/40">Aucune commande pour l&apos;instant.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {orders.map(o => (
        <div key={o.id} className="clip-card border border-white/10 bg-surface/50 p-4 transition hover:bg-surface/70">
          <div className="flex flex-wrap items-start justify-between gap-3">
            {/* En-tête */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <p className="font-display text-base tracking-wide text-ivory">
                  {o.ref}
                </p>
                <span className={`border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${statusMeta(o.status).badge}`}>
                  {statusMeta(o.status).label}
                </span>
              </div>
              <p className="font-mono text-[11px] text-ivory/50">
                {o.customerName}
                {" · "}
                {new Date(o.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <select
                value={normalizeStatus(o.status)}
                disabled={pending}
                onChange={e => handleStatusChange(o.id, e.target.value)}
                className="max-w-[220px] border border-white/15 bg-void px-3 py-1.5 font-mono text-xs outline-none focus:border-violet-electric disabled:opacity-60"
              >
                {statusOptionsFor(o.status).map(s => (
                  <option key={s} value={s}>{statusMeta(s).label}</option>
                ))}
              </select>
              {notedId === o.id && (
                <span className="font-mono text-[9px] uppercase tracking-widest text-emerald-400">Fil mis à jour</span>
              )}
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

          {/* Détails produits */}
          {o.products && (
            <div className="mt-3 border-t border-white/5 pt-3">
              <p className="font-mono text-xs text-ivory/70">{o.products}</p>
            </div>
          )}

          {/* Livraison / meetup */}
          <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-white/5 pt-3">
            {o.fulfillment && (
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ivory/50">
                <MapPin className="h-3 w-3" />
                {fulfillmentLabel(o.fulfillment)}
              </span>
            )}
            {o.scheduledDate && (
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-ivory/50">
                <Calendar className="h-3 w-3" />
                {o.scheduledDate}{o.scheduledSlot ? ` · ${o.scheduledSlot}` : ""}
              </span>
            )}
            {o.address && (
              <span className="font-mono text-[10px] text-ivory/40 truncate max-w-xs">
                {o.address}
              </span>
            )}
            <span className="ml-auto font-display text-base text-violet-electric">
              {formatPrice(o.total)}
            </span>
          </div>

          {!isDiscussionStatus(o.status) && (
            <div className="mt-3">
              <OrderTrackingCard
                orderId={o.id}
                status={o.status}
                fulfillment={o.fulfillment}
                tracking={o.tracking}
                createdAt={o.createdAt}
                scheduledSlot={formatScheduledLabel(o.scheduledDate, o.scheduledSlot)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
