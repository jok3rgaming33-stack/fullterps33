'use client'

import { useState } from 'react'
import { X, Zap } from 'lucide-react'

const TIERS = [
  { name: 'Eclair',   min: 0,    max: 199,  perks: ['Accès boutique standard', 'Points sur chaque commande'] },
  { name: 'Orage',    min: 200,  max: 499,  perks: ['Badge Orage', 'Priorité sur les nouveaux stocks', '+5% de points bonus'] },
  { name: 'Tempête',  min: 500,  max: 999,  perks: ['Badge Tempête', 'Accès early aux drops', '+10% de points bonus', 'Livraison prioritaire'] },
  { name: 'Ouragan',  min: 1000, max: null, perks: ['Badge Ouragan', 'Tarifs VIP', '+15% de points bonus', 'Support dédié', 'Invitations exclusives'] },
]

interface Props { currentPoints?: number }

export function LoyaltyModal({ currentPoints = 0 }: Props) {
  const [open, setOpen] = useState(false)
  const currentTier = TIERS.findLast((t) => currentPoints >= t.min) ?? TIERS[0]

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
            className="clip-card w-full max-w-md border border-white/10 bg-surface p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl tracking-wide text-ivory">Programme fidélité</h2>
              <button onClick={() => setOpen(false)} aria-label="Fermer">
                <X size={18} className="text-ivory/50 hover:text-ivory" />
              </button>
            </div>

            <p className="font-mono text-[11px] text-ivory/40">
              1 point par euro dépensé. Les paliers débloquent des avantages permanents.
            </p>

            <div className="space-y-3">
              {TIERS.map((tier) => {
                const active = tier.name === currentTier.name
                return (
                  <div
                    key={tier.name}
                    className={`clip-card border p-4 transition ${
                      active
                        ? 'border-violet-electric/60 bg-violet-electric/10'
                        : 'border-white/10 bg-void/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-display text-base tracking-wide ${active ? 'text-violet-electric' : 'text-ivory/60'}`}>
                        {tier.name}
                        {active && <span className="ml-2 font-mono text-[10px] text-violet-electric/70">— palier actuel</span>}
                      </span>
                      <span className="font-mono text-[10px] text-ivory/40">
                        {tier.max ? `${tier.min}–${tier.max} pts` : `${tier.min}+ pts`}
                      </span>
                    </div>
                    <ul className="space-y-0.5">
                      {tier.perks.map((p) => (
                        <li key={p} className="flex items-center gap-2 font-mono text-[10px] text-ivory/50">
                          <span className="text-violet-electric">▸</span> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
