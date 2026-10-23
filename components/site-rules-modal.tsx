"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, ChevronDown, ChevronUp, X } from "lucide-react"
import type { SiteRule } from "@/lib/site-rules"

type Props = {
  rules: SiteRule[]
  open: boolean
  /** Création de compte : chaque partie doit être ouverte avant d'accepter. */
  requireRead?: boolean
  onClose: () => void
  onAccept?: () => void
}

export function SiteRulesModal({ rules, open, requireRead = false, onClose, onAccept }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [seen, setSeen] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    if (!open) return
    setOpenId(null)
    setSeen(new Set())
  }, [open, rules])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (!requireRead || seen.size >= rules.length)) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose, requireRead, seen.size, rules.length])

  if (!open) return null

  const allSeen = rules.length === 0 || seen.size >= rules.length
  const canDismiss = !requireRead || allSeen

  const toggle = (id: string) => {
    setOpenId((current) => (current === id ? null : id))
    setSeen((current) => {
      const next = new Set(current)
      next.add(id)
      return next
    })
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-void/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-rules-title"
      onClick={() => { if (canDismiss) onClose() }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden border border-white/10 bg-surface shadow-2xl sm:rounded-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <h2 id="site-rules-title" className="font-display text-2xl tracking-wide text-ivory">Modalités et règles</h2>
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-ivory/50">
              {requireRead
                ? "Ouvre chaque partie pour pouvoir accepter et créer ton compte."
                : "Tu peux les relire à tout moment."}
            </p>
          </div>
          {canDismiss && (
            <button type="button" onClick={onClose} aria-label="Fermer" className="p-2 text-ivory/50 hover:text-ivory">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {requireRead && rules.length > 0 && (
          <div className="shrink-0 border-b border-white/10 px-5 py-3">
            <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-ivory/50">
              <span>Parties ouvertes</span>
              <span className="text-ivory">{seen.size} / {rules.length}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden bg-white/10">
              <div
                className="h-full bg-violet-electric transition-all duration-300"
                style={{ width: `${(seen.size / rules.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {rules.length === 0 && (
            <p className="font-mono text-sm text-ivory/50">Aucune modalité n&apos;est publiée pour le moment.</p>
          )}
          {rules.map((rule, index) => {
            const expanded = openId === rule.id
            const visited = seen.has(rule.id)
            return (
              <div
                key={rule.id}
                className={`border ${expanded ? "border-violet-electric/40 bg-white/[0.03]" : visited ? "border-violet-electric/20" : "border-white/10"}`}
              >
                <button
                  type="button"
                  onClick={() => toggle(rule.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="font-display text-sm tracking-wide text-ivory">
                    {index + 1}. {rule.title}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {requireRead && visited && <CheckCircle2 className="h-4 w-4 text-violet-electric" aria-label="Partie ouverte" />}
                    {expanded ? <ChevronUp className="h-4 w-4 text-ivory/40" /> : <ChevronDown className="h-4 w-4 text-ivory/40" />}
                  </span>
                </button>
                {expanded && (
                  <p className="border-t border-white/10 px-4 py-3 font-mono text-xs leading-relaxed text-ivory/70 whitespace-pre-wrap">
                    {rule.body}
                  </p>
                )}
              </div>
            )
          })}

          {requireRead && !allSeen && rules.length > 0 && (
            <p className="pt-2 text-center font-mono text-[11px] text-ivory/45">
              Encore {rules.length - seen.size} partie{rules.length - seen.size > 1 ? "s" : ""} à ouvrir.
            </p>
          )}

          {requireRead && allSeen && (
            <button
              type="button"
              onClick={onAccept}
              className="mt-2 flex w-full items-center justify-center gap-2 bg-violet-electric py-3 font-mono text-xs font-bold uppercase tracking-[0.15em] text-void transition hover:brightness-110"
            >
              <CheckCircle2 className="h-4 w-4" />
              J&apos;ai lu et j&apos;accepte
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
