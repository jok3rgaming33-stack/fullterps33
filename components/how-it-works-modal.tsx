'use client'

import { useState } from 'react'
import { X, Zap, ShieldCheck, Package, MessageSquare, Star } from 'lucide-react'

const STEPS = [
  {
    icon: ShieldCheck,
    title: 'Crée ton compte',
    body: 'Un clic suffit — pseudo et TOKEN sécurisé générés automatiquement. Conserve ton TOKEN : c\'est ta clé d\'accès.',
  },
  {
    icon: Package,
    title: 'Choisis tes produits',
    body: 'Parcours le catalogue, ajoute ce que tu veux au panier. Les stocks sont mis à jour en temps réel.',
  },
  {
    icon: MessageSquare,
    title: 'Finalise la commande',
    body: 'Valide ton panier. Un fil de discussion s\'ouvre pour chaque commande — coordonne livraison ou meet-up directement avec nous.',
  },
  {
    icon: Zap,
    title: 'Livraison ou meet-up',
    body: 'Choisis ton mode : livraison à domicile, meet-up ou click & collect. Les créneaux disponibles sont affichés à la commande.',
  },
  {
    icon: Star,
    title: 'Gagne des points',
    body: '1 point par euro dépensé. Monte en palier (Éclair → Orage → Tempête → Ouragan) et débloque des avantages exclusifs.',
  },
]

export function HowItWorksModal() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="clip-tag border border-violet-electric/40 bg-violet-electric/10 px-5 py-2 font-mono text-xs uppercase tracking-widest text-violet-electric transition hover:bg-violet-electric/20"
      >
        Comment ça marche ?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="clip-card w-full max-w-lg border border-white/10 bg-surface p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl tracking-wide text-ivory">
                Comment ça marche
              </h2>
              <button onClick={() => setOpen(false)} aria-label="Fermer">
                <X size={18} className="text-ivory/50 hover:text-ivory" />
              </button>
            </div>

            <div className="space-y-4">
              {STEPS.map((step, i) => {
                const Icon = step.icon
                return (
                  <div key={i} className="flex gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-electric/30 bg-violet-electric/10">
                      <Icon size={16} className="text-violet-electric" />
                    </div>
                    <div>
                      <p className="font-display text-sm tracking-wide text-ivory">{step.title}</p>
                      <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-ivory/50">
                        {step.body}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-2 w-full clip-tag bg-violet-electric py-2.5 font-mono text-xs uppercase tracking-widest text-void transition hover:bg-violet-deep"
            >
              C&apos;est parti
            </button>
          </div>
        </div>
      )}
    </>
  )
}
