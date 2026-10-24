"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Clock, Home, Loader2, MapPin, Package } from "lucide-react"
import { notifyArrivingInMinutes, updateThreadStatus } from "@/app/actions/messaging"
import type { LivreurOrder } from "@/app/actions/livreur"
import { fulfillmentLabel, normalizeStatus, statusMeta } from "@/lib/order-status"
import { formatPrice } from "@/lib/utils"

function linesOf(order: LivreurOrder) {
  const raw = (order.products || order.summary || "").replace(/^Commande de .+? :\s*/i, "")
  return raw.split(/\s+\+\s+/).map((s) => s.trim()).filter(Boolean)
}

export function RunDeliveryClient({ order }: { order: LivreurOrder }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const key = normalizeStatus(order.status)
  const meta = statusMeta(order.status)
  const delivery = (order.fulfillment || "").toLowerCase() !== "meetup"
  const canPing = delivery && (key === "livraison" || key === "arrivee")
  const canArrive = delivery && key === "livraison"
  const canDeliver = delivery && (key === "livraison" || key === "arrivee")
  const done = key === "livree"
  const onRoad = canPing || done
  const lines = linesOf(order)

  const run = (task: () => Promise<{ ok: boolean; error?: string }>, doneNote?: string) => {
    setError(null)
    startTransition(async () => {
      const res = await task()
      if (!res.ok) {
        setError(res.error ?? "Action impossible.")
        return
      }
      setNote(doneNote ?? null)
      router.refresh()
    })
  }

  return (
    <div className="min-h-screen bg-void px-4 py-8 text-ivory">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ivory/40">Livraison en cours</p>
          <h1 className="font-display text-2xl tracking-wide">Commande #{order.id}</h1>
        </div>

        <section className="border border-white/10 bg-surface/50 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-mono text-sm">{order.customerName}</p>
            <span className={`px-2 py-0.5 font-mono text-[10px] ${meta.badge}`}>{meta.label}</span>
          </div>
          <p className="font-mono text-[11px] text-ivory/50">
            {fulfillmentLabel(order.fulfillment)}
            {order.scheduledDate ? ` · ${order.scheduledDate}` : ""}
            {order.scheduledSlot ? ` · ${order.scheduledSlot}` : ""}
            {` · ${formatPrice(order.total)}`}
          </p>
          {order.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-start gap-2 border border-white/10 bg-void px-3 py-2 font-mono text-xs"
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-electric" />
              {order.address}
            </a>
          )}
        </section>

        <section className="border border-white/10 bg-surface/40 p-4">
          <p className="mb-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-ivory/40">
            <Package className="h-3 w-3" /> Contenu de la commande
          </p>
          {lines.length === 0 ? (
            <p className="font-mono text-xs text-ivory/40">Non détaillé.</p>
          ) : (
            <ul className="space-y-1 font-mono text-sm">
              {lines.map((line) => <li key={line}>{line}</li>)}
            </ul>
          )}
        </section>

        {error && <p className="border border-signal/30 bg-signal/10 px-3 py-2 font-mono text-xs text-signal">{error}</p>}
        {note && <p className="border border-violet-electric/30 bg-violet-electric/10 px-3 py-2 font-mono text-xs text-violet-electric">{note}</p>}

        {!delivery ? (
          <p className="border border-white/10 px-4 py-6 text-center font-mono text-xs text-ivory/50">
            Retrait : le suivi se fait dans l&apos;admin.
          </p>
        ) : done ? (
          <div className="flex flex-col items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 px-4 py-8 text-center">
            <Check className="h-8 w-8 text-emerald-400" />
            <p className="font-mono text-sm text-emerald-300">Commande livrée</p>
            <p className="font-mono text-[11px] text-emerald-200/80">Le client a été prévenu dans son fil.</p>
          </div>
        ) : !onRoad ? (
          <p className="border border-white/10 px-4 py-6 text-center font-mono text-xs text-ivory/50">
            Ces boutons s&apos;ouvrent quand le statut passe à « Livraison en cours ».
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={pending || !canPing}
              onClick={() => run(() => notifyArrivingInMinutes(order.id, 5), "Le client a été prévenu : 5 minutes.")}
              className="flex min-h-16 items-center justify-center gap-2 bg-amber-400 px-4 font-mono text-sm font-bold text-black disabled:opacity-40"
            >
              {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Clock className="h-5 w-5" />}
              Je suis à 5 minutes
            </button>
            <button
              type="button"
              disabled={pending || !canArrive}
              onClick={() => run(() => updateThreadStatus(order.id, "arrivee"))}
              className="flex min-h-16 items-center justify-center gap-2 bg-cyan-400 px-4 font-mono text-sm font-bold text-black disabled:opacity-40"
            >
              {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Home className="h-5 w-5" />}
              Je suis arrivé
            </button>
            <button
              type="button"
              disabled={pending || !canDeliver}
              onClick={() => run(() => updateThreadStatus(order.id, "livree"))}
              className="flex min-h-16 items-center justify-center gap-2 bg-emerald-500 px-4 font-mono text-sm font-bold text-black disabled:opacity-40"
            >
              {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Package className="h-5 w-5" />}
              Commande livrée
            </button>
          </div>
        )}

        <Link href="/livreur" className="text-center font-mono text-[11px] text-ivory/40 underline-offset-2 hover:underline">
          Retour à la carte
        </Link>
      </div>
    </div>
  )
}
