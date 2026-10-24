"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, LogOut, MapPin, Package } from "lucide-react"
import { AdminMap } from "@/components/admin-map"
import type { OrderThread } from "@/app/actions/messaging"
import { updateThreadStatus } from "@/app/actions/messaging"
import type { LivreurOrder } from "@/app/actions/livreur"
import { logoutToLogin } from "@/app/actions/admin"
import { fulfillmentLabel, statusMeta, type OrderStatusKey } from "@/lib/order-status"
import { formatPrice } from "@/lib/utils"

const CHOICES: OrderStatusKey[] = ["bientot_livraison", "livraison", "livree", "annulee"]

function toThread(order: LivreurOrder): OrderThread {
  return {
    id: order.id,
    userToken: null,
    customerName: order.customerName,
    orderId: order.id,
    summary: order.summary,
    products: order.products,
    total: order.total,
    fulfillment: order.fulfillment,
    address: order.address || null,
    lat: order.lat,
    lng: order.lng,
    scheduledDate: order.scheduledDate || null,
    scheduledSlot: order.scheduledSlot || null,
    status: order.status,
    unreadAdmin: 0,
    unreadClient: 0,
    createdAt: order.createdAt,
    updatedAt: order.createdAt,
    tracking: {},
  }
}

function linesOf(order: LivreurOrder) {
  const raw = (order.products || order.summary || "").replace(/^Commande de .+? :\s*/i, "")
  return raw.split(/\s+\+\s+/).map((s) => s.trim()).filter(Boolean)
}

export function LivreurBoard({ orders, pseudo }: { orders: LivreurOrder[]; pseudo: string }) {
  const router = useRouter()
  const [openId, setOpenId] = useState<number | null>(orders[0]?.id ?? null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-void text-ivory">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-surface/80 px-4 py-3 backdrop-blur">
        <div>
          <p className="font-display text-lg tracking-wide">Tournée</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">{pseudo}</p>
        </div>
        <form action={logoutToLogin}>
          <button type="submit" className="inline-flex items-center gap-2 border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-ivory/60">
            <LogOut className="h-3.5 w-3.5" /> Sortir
          </button>
        </form>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4">
        <section>
          <h2 className="mb-3 font-display text-xl">Carte des commandes</h2>
          <AdminMap threads={orders.map(toThread)} lockOrigin />
        </section>

        {error && <p className="font-mono text-xs text-signal">{error}</p>}

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl">Commandes</h2>
          {orders.length === 0 && (
            <p className="font-mono text-sm text-ivory/40">Aucune commande.</p>
          )}
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              open={openId === order.id}
              onToggle={() => setOpenId((id) => (id === order.id ? null : order.id))}
              onError={setError}
              onRefresh={() => router.refresh()}
            />
          ))}
        </section>
      </main>
    </div>
  )
}

function OrderCard({
  order,
  open,
  onToggle,
  onError,
  onRefresh,
}: {
  order: LivreurOrder
  open: boolean
  onToggle: () => void
  onError: (msg: string | null) => void
  onRefresh: () => void
}) {
  const router = useRouter()
  const meta = statusMeta(order.status)
  const delivery = (order.fulfillment || "").toLowerCase() !== "meetup"
  const [next, setNext] = useState<OrderStatusKey>("bientot_livraison")
  const [comment, setComment] = useState("")
  const [pending, startTransition] = useTransition()
  const lines = linesOf(order)
  const onTour = order.status === "livraison" || order.status === "arrivee"

  const apply = () => {
    if (next === "annulee" && !comment.trim()) {
      onError("Le commentaire est obligatoire pour annuler.")
      return
    }
    onError(null)
    startTransition(async () => {
      const res = await updateThreadStatus(order.id, next, next === "annulee" ? { comment } : undefined)
      if (!res.ok) {
        onError(res.error ?? "Statut impossible.")
        return
      }
      setComment("")
      onRefresh()
      if (next === "livraison") router.push(`/livreur/tournee/${order.id}`)
    })
  }

  return (
    <article className="border border-white/10 bg-surface/40">
      <button type="button" onClick={onToggle} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left">
        <div>
          <p className="font-mono text-sm">
            <span className="text-violet-electric">#{order.id}</span> {order.customerName}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-ivory/40">
            {fulfillmentLabel(order.fulfillment)}
            {order.scheduledSlot ? ` · ${order.scheduledSlot}` : ""}
            {order.scheduledDate ? ` · ${order.scheduledDate}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-base">{formatPrice(order.total)}</p>
          <span className={`mt-1 inline-block px-2 py-0.5 font-mono text-[10px] ${meta.badge}`}>{meta.label}</span>
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-white/10 px-4 py-3">
          {order.address && (
            <p className="flex items-start gap-2 font-mono text-xs text-ivory/80">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-electric" />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                {order.address}
              </a>
            </p>
          )}
          <div>
            <p className="mb-1 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-ivory/40">
              <Package className="h-3 w-3" /> Contenu
            </p>
            {lines.length === 0 ? (
              <p className="font-mono text-xs text-ivory/40">Non détaillé.</p>
            ) : (
              <ul className="space-y-1 font-mono text-xs">
                {lines.map((line) => <li key={line}>{line}</li>)}
              </ul>
            )}
          </div>

          {delivery ? (
            <div className="space-y-2">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Nouveau statut</span>
                <select
                  value={next}
                  onChange={(e) => setNext(e.target.value as OrderStatusKey)}
                  className="border border-white/15 bg-void px-3 py-2 font-mono text-xs outline-none focus:border-violet-electric"
                >
                  {CHOICES.map((key) => (
                    <option key={key} value={key}>{statusMeta(key).label}</option>
                  ))}
                </select>
              </label>
              {next === "annulee" && (
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Commentaire obligatoire"
                  className="w-full border border-white/15 bg-void px-3 py-2 font-mono text-xs outline-none focus:border-violet-electric"
                />
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={apply}
                  disabled={pending}
                  className="inline-flex items-center gap-2 bg-violet-electric px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-void disabled:opacity-50"
                >
                  {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Mettre à jour le fil
                </button>
                {onTour && (
                  <Link
                    href={`/livreur/tournee/${order.id}`}
                    className="border border-violet-electric/40 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-violet-electric"
                  >
                    Page de livraison
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <p className="font-mono text-[11px] text-ivory/40">Retrait : le suivi se fait dans l&apos;admin.</p>
          )}
        </div>
      )}
    </article>
  )
}
