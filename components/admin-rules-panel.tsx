"use client"

import { useState, useTransition } from "react"
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react"
import { saveSiteRules } from "@/app/actions/settings"
import { isForbiddenCopy } from "@/lib/brand"
import type { SiteRule } from "@/lib/site-rules"
import { notifyAdminChange } from "@/lib/admin-events"
import { useRouter } from "next/navigation"

function newId() {
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function AdminRulesPanel({ initial }: { initial: SiteRule[] }) {
  const router = useRouter()
  const [rules, setRules] = useState<SiteRule[]>(initial)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const update = (id: string, patch: Partial<SiteRule>) => {
    setRules((current) => current.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)))
  }

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= rules.length) return
    setRules((current) => {
      const next = current.slice()
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  const save = () => {
    const invalid = rules.some((rule) => !rule.title.trim() || !rule.body.trim())
    if (invalid) {
      setMessage("Chaque partie doit avoir un titre et un texte.")
      return
    }
    setMessage("Enregistrement…")
    startTransition(async () => {
      const res = await saveSiteRules(rules)
      if (!res.ok) {
        setMessage(res.error ?? "Échec de l'enregistrement")
        return
      }
      notifyAdminChange("rules")
      setMessage(rules.length === 0
        ? "Aucune modalité publiée. La création de compte n'est plus bloquée par cette lecture."
        : "Modalités enregistrées. Les prochains comptes devront les relire.")
      router.refresh()
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="font-mono text-xs leading-relaxed text-ivory/50">
        Ces parties s&apos;affichent à la création du compte. Le client doit ouvrir chacune d&apos;elles avant de pouvoir accepter. Le lien « Modalités » de la boutique permet de les relire ensuite.
      </p>

      {rules.map((rule, index) => {
        const hidden = isForbiddenCopy(rule.title) || isForbiddenCopy(rule.body)
        return (
          <div key={rule.id} className="space-y-3 border border-white/10 bg-surface/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Partie {index + 1}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Monter" className="p-2 text-ivory/50 hover:text-ivory disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === rules.length - 1} aria-label="Descendre" className="p-2 text-ivory/50 hover:text-ivory disabled:opacity-30">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRules((current) => current.filter((item) => item.id !== rule.id))}
                  aria-label="Supprimer cette partie"
                  className="p-2 text-ivory/50 hover:text-signal"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <input
              value={rule.title}
              onChange={(event) => update(rule.id, { title: event.target.value })}
              placeholder="Titre de la partie"
              className="w-full border border-white/10 bg-void px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60"
            />
            <textarea
              value={rule.body}
              onChange={(event) => update(rule.id, { body: event.target.value })}
              placeholder="Texte lu par le client"
              rows={5}
              className="w-full resize-y border border-white/10 bg-void px-3 py-2 font-mono text-sm leading-relaxed text-ivory outline-none focus:border-violet-electric/60"
            />
            {hidden && (
              <p className="font-mono text-[10px] leading-relaxed text-signal">
                Cette partie ne sera pas montrée aux visiteurs : elle contient une formulation qui n&apos;est pas affichée sur la boutique.
              </p>
            )}
          </div>
        )
      })}

      {rules.length === 0 && (
        <p className="border border-white/10 px-4 py-6 text-center font-mono text-xs text-ivory/40">
          Aucune partie. La création de compte ne demandera pas de lecture.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => setRules((current) => [...current, { id: newId(), title: "", body: "" }])}
          className="flex items-center justify-center gap-2 border border-white/15 px-4 py-2 font-mono text-xs uppercase tracking-widest text-ivory/70 hover:border-violet-electric/40 hover:text-ivory"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter une partie
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="flex items-center justify-center gap-2 bg-violet-electric/15 px-4 py-2 font-mono text-xs uppercase tracking-widest text-violet-electric ring-1 ring-violet-electric/30 hover:bg-violet-electric/25 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" /> Enregistrer
        </button>
      </div>
      {message && <p className="font-mono text-xs text-violet-electric">{message}</p>}
    </div>
  )
}
