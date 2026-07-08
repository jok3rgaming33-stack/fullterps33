"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, X, Check, Zap, Gift, Tag } from "lucide-react"
import type { LoyaltyTier } from "@/app/actions/loyalty"
import { upsertLoyaltyTier, deleteLoyaltyTier } from "@/app/actions/loyalty"

interface Props {
  tiers: LoyaltyTier[]
  rewardCodes: {
    code: string
    discountEuros: number
    label: string
    issuedTo: string | null
    usedBy: string | null
    active: boolean
    createdAt: string
  }[]
}

const EMPTY: Omit<LoyaltyTier, "id"> = {
  label: "",
  pointsRequired: 0,
  discountEuros: 0,
  sortOrder: 1,
}

export function AdminLoyaltyPanel({ tiers, rewardCodes }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [editing, setEditing]   = useState<(Omit<LoyaltyTier, "id"> & { id?: number }) | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  function openNew() {
    setEditing({ ...EMPTY, sortOrder: (tiers.at(-1)?.sortOrder ?? 0) + 1 })
  }

  function openEdit(tier: LoyaltyTier) {
    setEditing({ ...tier })
  }

  function handleSave() {
    if (!editing) return
    if (!editing.label.trim() || editing.pointsRequired <= 0 || editing.discountEuros <= 0) {
      setFeedback("Tous les champs sont requis et les valeurs doivent être positives.")
      return
    }
    startTransition(async () => {
      const res = await upsertLoyaltyTier(editing)
      if (!res.ok) { setFeedback(res.error ?? "Erreur"); return }
      setEditing(null)
      setFeedback("Palier sauvegardé.")
      setTimeout(() => setFeedback(null), 2500)
      router.refresh()
    })
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      await deleteLoyaltyTier(id)
      router.refresh()
    })
  }

  return (
    <div className="space-y-8">

      {/* ── Paliers ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl tracking-wide text-ivory">Paliers fidélité</h2>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-ivory/30">
              1€ dépensé = 1 point &nbsp;·&nbsp; codes à usage unique générés par le client
            </p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 border border-violet-electric/40 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-violet-electric hover:bg-violet-electric/10 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter un palier
          </button>
        </div>

        {tiers.length === 0 && (
          <p className="py-6 text-center font-mono text-sm text-ivory/30">Aucun palier configuré.</p>
        )}

        {tiers.map((tier) => (
          <div key={tier.id} className="flex items-center justify-between border border-white/10 bg-surface/40 px-5 py-4">
            <div className="flex items-center gap-4">
              <Zap className="h-4 w-4 flex-shrink-0 text-violet-electric" />
              <div>
                <p className="font-mono text-sm text-ivory">{tier.label}</p>
                <p className="font-mono text-[10px] text-ivory/40">
                  {tier.pointsRequired} pts requis &nbsp;·&nbsp; -{tier.discountEuros}€ de réduction
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openEdit(tier)}
                className="border border-white/10 p-2 text-ivory/40 hover:border-violet-electric/40 hover:text-violet-electric transition"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleDelete(tier.id)}
                className="border border-white/10 p-2 text-ivory/40 hover:border-red-500/40 hover:text-red-400 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {feedback && (
          <p className="font-mono text-[11px] text-violet-electric">{feedback}</p>
        )}
      </section>

      {/* ── Codes récompenses générés ── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl tracking-wide text-ivory">Codes récompenses émis</h2>
        {rewardCodes.length === 0 && (
          <p className="py-4 text-center font-mono text-sm text-ivory/30">Aucun code récompense généré.</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-white/10 text-ivory/30 uppercase tracking-widest text-[9px]">
                <th className="pb-2 text-left">Code</th>
                <th className="pb-2 text-left">Palier</th>
                <th className="pb-2 text-left">Valeur</th>
                <th className="pb-2 text-left">Émis à</th>
                <th className="pb-2 text-left">Utilisé par</th>
                <th className="pb-2 text-left">Statut</th>
                <th className="pb-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rewardCodes.map((c) => (
                <tr key={c.code} className="text-ivory/60">
                  <td className="py-2 pr-4">
                    <span className="font-bold text-violet-electric">{c.code}</span>
                  </td>
                  <td className="py-2 pr-4">{c.label}</td>
                  <td className="py-2 pr-4">-{c.discountEuros}€</td>
                  <td className="py-2 pr-4 truncate max-w-[100px]" title={c.issuedTo ?? "—"}>
                    {c.issuedTo ? `${c.issuedTo.slice(0, 8)}…` : "—"}
                  </td>
                  <td className="py-2 pr-4 truncate max-w-[100px]" title={c.usedBy ?? "—"}>
                    {c.usedBy ? `${c.usedBy.slice(0, 8)}…` : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    {c.active ? (
                      <span className="text-emerald-400">Actif</span>
                    ) : (
                      <span className="text-ivory/30">Consommé</span>
                    )}
                  </td>
                  <td className="py-2 text-ivory/30">
                    {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Modal édition palier ── */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-sm border border-white/10 bg-surface p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg tracking-wide">
                {editing.id ? "Modifier le palier" : "Nouveau palier"}
              </h3>
              <button onClick={() => setEditing(null)} className="text-ivory/40 hover:text-ivory">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label-admin mb-1">Nom du palier</label>
                <input
                  type="text"
                  value={editing.label}
                  onChange={(e) => setEditing((p) => p && ({ ...p, label: e.target.value }))}
                  placeholder="ex: Palier Bronze"
                  className="input-admin"
                />
              </div>
              <div>
                <label className="label-admin mb-1">Points requis</label>
                <input
                  type="number"
                  min="1"
                  value={editing.pointsRequired || ""}
                  onChange={(e) => setEditing((p) => p && ({ ...p, pointsRequired: parseInt(e.target.value) || 0 }))}
                  placeholder="ex: 300"
                  className="input-admin"
                />
              </div>
              <div>
                <label className="label-admin mb-1">Réduction (€)</label>
                <input
                  type="number"
                  min="1"
                  value={editing.discountEuros || ""}
                  onChange={(e) => setEditing((p) => p && ({ ...p, discountEuros: parseInt(e.target.value) || 0 }))}
                  placeholder="ex: 10"
                  className="input-admin"
                />
              </div>
              <div>
                <label className="label-admin mb-1">Ordre d&apos;affichage</label>
                <input
                  type="number"
                  min="1"
                  value={editing.sortOrder || ""}
                  onChange={(e) => setEditing((p) => p && ({ ...p, sortOrder: parseInt(e.target.value) || 1 }))}
                  className="input-admin"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setEditing(null)}
                className="border border-white/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-ivory/40 hover:text-ivory transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-violet-electric/20 border border-violet-electric/40 px-5 py-2 font-mono text-[10px] uppercase tracking-widest text-violet-electric hover:bg-violet-electric/30 transition"
              >
                <Check className="h-3.5 w-3.5" />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
