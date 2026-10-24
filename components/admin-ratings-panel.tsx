"use client"

import { useEffect, useState } from "react"
import { Loader2, Star, Trash2 } from "lucide-react"
import {
  deleteRating,
  getRatingsAdminOverview,
  sendRatingInvites,
  type RatingAdminOverview,
} from "@/app/actions/ratings"
import { fulfillmentLabel } from "@/lib/order-status"
import { formatPrice } from "@/lib/utils"

function fmt(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  })
}

export function AdminRatingsPanel() {
  const [data, setData] = useState<RatingAdminOverview | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState<number | "all" | null>(null)

  async function load() {
    try {
      setData(await getRatingsAdminOverview())
    } catch {
      setError("Impossible de charger les avis.")
    }
  }

  useEffect(() => { void load() }, [])

  async function invite(ids: number[], key: number | "all") {
    setBusy(key)
    const result = await sendRatingInvites(ids)
    setBusy(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    await load()
    setError(result.sent ? `${result.sent} invitation${result.sent > 1 ? "s" : ""} envoyée${result.sent > 1 ? "s" : ""}.` : "Rien à inviter.")
  }

  async function remove(id: number) {
    if (!window.confirm("Retirer cet avis de la boutique ?")) return
    setBusy(id)
    const result = await deleteRating(id)
    setBusy(null)
    if (!result.ok) {
      setError(result.error ?? "Suppression impossible.")
      return
    }
    await load()
  }

  if (!data) {
    return (
      <p className="flex items-center gap-2 font-mono text-xs text-ivory/40">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement des avis
      </p>
    )
  }

  const pendingIds = data.targets.map((t) => t.threadId)

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Avis", String(data.stats.totalRatings)],
          ["Moyenne", data.stats.avgScore == null ? "—" : data.stats.avgScore.toFixed(1)],
          ["Commandes à noter", String(data.stats.pendingOrders)],
        ].map(([label, value]) => (
          <div key={label} className="border border-white/10 bg-surface/40 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ivory/35">{label}</p>
            <p className="mt-1 font-display text-2xl text-ivory">{value}</p>
          </div>
        ))}
      </div>

      {error && <p className="font-mono text-xs text-violet-electric">{error}</p>}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-xl tracking-wide">Commandes livrées sans avis</h3>
          <button
            type="button"
            disabled={!pendingIds.length || busy === "all"}
            onClick={() => void invite(pendingIds, "all")}
            className="border border-violet-electric/40 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-violet-electric disabled:opacity-40"
          >
            {busy === "all" ? "Envoi…" : "Inviter tout le monde"}
          </button>
        </div>
        {data.targets.length === 0 ? (
          <p className="font-mono text-sm text-ivory/40">Aucune commande livrée en attente d&apos;avis.</p>
        ) : (
          <ul className="space-y-2">
            {data.targets.map((target) => (
              <li key={target.threadId} className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-surface/30 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-sm text-ivory">{target.customerName}</p>
                  <p className="truncate font-mono text-[10px] text-ivory/40">
                    #{target.threadId} · {fulfillmentLabel(target.fulfillment)} · {formatPrice(target.total)} · {target.ratedCount}/{target.productCount} notés
                    {target.invitedAt ? ` · invité ${fmt(target.invitedAt)}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy === target.threadId}
                  onClick={() => void invite([target.threadId], target.threadId)}
                  className="border border-white/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-ivory/70 hover:border-violet-electric/40 hover:text-violet-electric disabled:opacity-40"
                >
                  {target.invitedAt ? "Relancer" : "Inviter"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 flex items-center gap-2 font-display text-xl tracking-wide">
          <Star className="h-4 w-4 text-amber-300" /> Derniers avis
        </h3>
        {data.recent.length === 0 ? (
          <p className="font-mono text-sm text-ivory/40">Aucun avis pour l&apos;instant.</p>
        ) : (
          <ul className="space-y-2">
            {data.recent.map((row) => (
              <li key={row.id} className="border border-white/10 bg-surface/30 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-sm text-ivory">{row.productName}</p>
                    <p className="font-mono text-[10px] text-ivory/40">
                      {row.pseudo} · {row.avgScore.toFixed(1)}/5 · #{row.threadId} · {fmt(row.createdAt)}
                    </p>
                    {row.comment && <p className="mt-2 font-sans text-sm text-ivory/70">{row.comment}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => void remove(row.id)}
                    className="text-ivory/30 hover:text-red-300"
                    aria-label="Retirer l'avis"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
