"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { createPromoCode, deletePromoCode, type PromoCode } from "@/app/actions/promo"

const emptyForm = { code: "", type: "percent" as "percent" | "fixed", value: "", minAmount: "0", active: true }

export function AdminPromosPanel({ promos }: { promos: PromoCode[] }) {
  const [form, setForm] = useState(emptyForm)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const value = parseInt(form.value, 10)
    const minAmount = parseInt(form.minAmount, 10) || 0
    if (!form.code.trim() || Number.isNaN(value)) {
      setError("Code et valeur requis")
      return
    }
    startTransition(async () => {
      await createPromoCode({ code: form.code.trim(), type: form.type, value, minAmount, active: form.active })
      setForm(emptyForm)
      router.refresh()
    })
  }

  function handleDelete(code: string) {
    startTransition(async () => {
      await deletePromoCode(code)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_1.4fr]">
      <form onSubmit={handleSubmit} className="clip-card flex flex-col gap-3 border border-white/10 bg-surface p-5">
        <h3 className="font-display text-lg tracking-wide">Ajouter un code promo</h3>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">Code</span>
          <input
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="ORAGE10"
            className="border border-white/15 bg-void px-3 py-2 text-sm uppercase outline-none focus:border-violet-electric"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">Type</span>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "percent" | "fixed" }))}
              className="border border-white/15 bg-void px-3 py-2 text-sm outline-none focus:border-violet-electric"
            >
              <option value="percent">Pourcentage (%)</option>
              <option value="fixed">Montant fixe (€)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">Valeur</span>
            <input
              type="number"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              placeholder={form.type === "percent" ? "10" : "15"}
              className="border border-white/15 bg-void px-3 py-2 text-sm outline-none focus:border-violet-electric"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">
            Montant minimum (€)
          </span>
          <input
            type="number"
            value={form.minAmount}
            onChange={(e) => setForm((f) => ({ ...f, minAmount: e.target.value }))}
            className="border border-white/15 bg-void px-3 py-2 text-sm outline-none focus:border-violet-electric"
          />
        </label>

        <label className="flex items-center gap-2 font-mono text-xs text-ivory/70">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            className="accent-violet-500"
          />
          Actif
        </label>

        {error && <p className="font-mono text-[11px] text-signal">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="clip-tag mt-2 bg-violet-electric py-2.5 font-mono text-xs font-bold uppercase tracking-[0.15em] text-void hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "…" : "Ajouter"}
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {promos.length === 0 && <p className="font-mono text-sm text-ivory/40">Aucun code promo.</p>}
        {promos.map((p) => (
          <div key={p.code} className="flex items-center justify-between border border-white/10 bg-surface px-4 py-3">
            <div>
              <p className="font-mono text-sm font-bold text-violet-electric">{p.code}</p>
              <p className="font-mono text-[10px] uppercase text-ivory/40">
                {p.type === "percent" ? `${p.value}%` : `${p.value}€`}
                {p.minAmount > 0 && ` · dès ${p.minAmount}€`}
                {!p.active && " · inactif"}
              </p>
            </div>
            <button onClick={() => handleDelete(p.code)} aria-label="Supprimer" className="text-ivory/50 hover:text-signal">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
