"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Check, Loader2, Star, X } from "lucide-react"
import { getRatableProducts, submitRating, type RatableProduct } from "@/app/actions/ratings"
import { RATING_AXES, type RatingAxis, type RatingScores } from "@/lib/ratings"

const EMPTY: RatingScores = { taste: 0, bottle: 0, packaging: 0, delivery: 0 }

function StarPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-xs text-ivory/60">{label}</span>
      <div className="flex" onMouseLeave={() => setHover(0)} role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((star) => {
          const on = star <= (hover || value)
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onMouseEnter={() => setHover(star)}
              aria-label={`${star} sur 5`}
              className="p-0.5"
            >
              <Star className={`h-5 w-5 ${on ? "fill-amber-300 text-amber-300" : "text-ivory/25"}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ProductRatingModal({ threadId, onClose }: { threadId: number; onClose: () => void }) {
  const [products, setProducts] = useState<RatableProduct[] | null>(null)
  const [index, setIndex] = useState(0)
  const [scores, setScores] = useState<RatingScores>(EMPTY)
  const [comment, setComment] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    getRatableProducts(threadId).then((list) => {
      if (cancelled) return
      const pendingOnes = list.filter((item) => !item.alreadyRated)
      setProducts(pendingOnes)
    }).catch(() => {
      if (!cancelled) setProducts([])
    })
    return () => { cancelled = true }
  }, [threadId])

  const current = products?.[index] ?? null
  const complete = RATING_AXES.every((axis) => scores[axis.key] >= 1)

  function setAxis(key: RatingAxis, value: number) {
    setScores((prev) => ({ ...prev, [key]: value }))
  }

  async function send() {
    if (!current || !complete || pending) return
    setPending(true)
    setError("")
    const result = await submitRating({
      threadId: current.threadId,
      productId: current.productId,
      scores,
      comment,
    })
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    const next = index + 1
    if (!products || next >= products.length) {
      setDone(true)
      return
    }
    setIndex(next)
    setScores(EMPTY)
    setComment("")
  }

  const dialog = (
    <div className="fixed inset-0 z-[260] flex items-end justify-center bg-void/80 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Noter la commande">
      <button type="button" className="absolute inset-0" aria-label="Fermer" onClick={onClose} />
      <div className="relative w-full max-w-md border border-white/10 bg-surface p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-electric">Avis</p>
            <h2 className="mt-1 font-display text-xl tracking-wide text-ivory">
              {done ? "Merci" : current?.productName ?? "Noter"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="text-ivory/50 hover:text-ivory" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!products && (
          <p className="flex items-center gap-2 font-mono text-xs text-ivory/40">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement
          </p>
        )}

        {products && products.length === 0 && (
          <p className="font-mono text-sm text-ivory/60">
            Cette commande n&apos;a pas de produit à noter, ou tu les as déjà notés.
          </p>
        )}

        {done && (
          <p className="flex items-center gap-2 font-mono text-sm text-ivory/70">
            <Check className="h-4 w-4 text-emerald-300" /> Tes notes sont enregistrées.
          </p>
        )}

        {current && !done && (
          <div className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ivory/35">
              Produit {index + 1} / {products?.length}
            </p>
            {RATING_AXES.map((axis) => (
              <StarPicker
                key={axis.key}
                label={axis.label}
                value={scores[axis.key]}
                onChange={(value) => setAxis(axis.key, value)}
              />
            ))}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Commentaire, si tu veux (facultatif)"
              className="mt-2 w-full resize-none border border-white/10 bg-void px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/50"
            />
            {error && <p className="font-mono text-xs text-red-300">{error}</p>}
            <button
              type="button"
              disabled={!complete || pending}
              onClick={() => void send()}
              className="w-full bg-violet-electric px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-void disabled:opacity-40"
            >
              {pending ? "Envoi…" : index + 1 === products?.length ? "Enregistrer" : "Suivant"}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  if (typeof document === "undefined") return dialog
  return createPortal(dialog, document.body)
}
