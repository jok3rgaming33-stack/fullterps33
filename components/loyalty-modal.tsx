'use client'

import { useState, useTransition } from 'react'
import { X, Zap, Gift, Check, Copy } from 'lucide-react'
import type { LoyaltyTier } from '@/app/actions/loyalty'
import { claimLoyaltyReward } from '@/app/actions/loyalty'

interface Props {
  currentPoints: number
  tiers: LoyaltyTier[]
}

export function LoyaltyModal({ currentPoints, tiers }: Props) {
  const [open, setOpen] = useState(false)
  const [claiming, setClaiming] = useState<number | null>(null)
  const [results, setResults] = useState<Record<number, { code?: string; error?: string }>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleClaim(tier: LoyaltyTier) {
    setClaiming(tier.id)
    startTransition(async () => {
      const res = await claimLoyaltyReward(tier.id)
      setResults((p) => ({ ...p, [tier.id]: res }))
      setClaiming(null)
    })
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  // Trier les paliers par points requis
  const sorted = [...tiers].sort((a, b) => a.pointsRequired - b.pointsRequired)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-violet-electric transition hover:text-violet-deep"
      >
        <Zap size={12} />
        Voir les paliers
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="clip-card w-full max-w-md border border-white/10 bg-surface p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl tracking-wide text-ivory">Programme fidélité</h2>
              <button onClick={() => setOpen(false)} aria-label="Fermer">
                <X size={18} className="text-ivory/50 hover:text-ivory" />
              </button>
            </div>

            <p className="font-mono text-[11px] text-ivory/40">
              1 point par euro dépensé. Atteins un palier pour générer un code de réduction à usage unique.
            </p>

            <div className="space-y-3">
              {sorted.length === 0 && (
                <p className="text-center font-mono text-xs text-ivory/30 py-4">
                  Aucun palier configuré pour le moment.
                </p>
              )}

              {sorted.map((tier) => {
                const eligible = currentPoints >= tier.pointsRequired
                const result   = results[tier.id]
                const isClaiming = claiming === tier.id
                const progress = Math.min(100, Math.round((currentPoints / tier.pointsRequired) * 100))

                return (
                  <div
                    key={tier.id}
                    className={`clip-card border p-4 transition ${
                      eligible
                        ? 'border-violet-electric/60 bg-violet-electric/10'
                        : 'border-white/10 bg-void/50'
                    }`}
                  >
                    {/* En-tête */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`font-display text-base tracking-wide ${eligible ? 'text-violet-electric' : 'text-ivory/60'}`}>
                        {tier.label}
                      </span>
                      <span className="font-mono text-[10px] text-ivory/40">
                        {tier.pointsRequired} pts &nbsp;→&nbsp; -{tier.discountEuros}€
                      </span>
                    </div>

                    {/* Barre de progression */}
                    {!eligible && (
                      <div className="mb-3">
                        <div className="h-1 w-full overflow-hidden bg-void">
                          <div
                            className="h-full bg-violet-electric/40 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="mt-1 font-mono text-[9px] text-ivory/30">
                          {tier.pointsRequired - currentPoints} pts manquants
                        </p>
                      </div>
                    )}

                    {/* Code déjà généré */}
                    {result?.code && (
                      <div className="flex items-center justify-between bg-void/60 border border-violet-electric/30 px-3 py-2 mb-2">
                        <span className="font-mono text-sm font-bold text-violet-electric tracking-wider">
                          {result.code}
                        </span>
                        <button
                          onClick={() => handleCopy(result.code!)}
                          className="text-ivory/40 hover:text-ivory transition"
                          title="Copier"
                        >
                          {copied === result.code ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    )}

                    {/* Erreur */}
                    {result?.error && !result.code && (
                      <p className="mb-2 font-mono text-[10px] text-amber-400">{result.error}</p>
                    )}

                    {/* Bouton claim */}
                    {eligible && !result?.code && (
                      <button
                        onClick={() => handleClaim(tier)}
                        disabled={isClaiming}
                        className="flex items-center gap-2 border border-violet-electric/40 bg-violet-electric/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-violet-electric hover:bg-violet-electric/20 transition disabled:opacity-50"
                      >
                        <Gift className="h-3.5 w-3.5" />
                        {isClaiming ? 'Génération…' : 'Obtenir mon code'}
                      </button>
                    )}

                    {eligible && result?.code && (
                      <p className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Code prêt — colle-le dans le panier
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            <p className="font-mono text-[10px] text-ivory/20 text-center">
              Les points sont débités dès la génération du code. Code à usage unique.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
