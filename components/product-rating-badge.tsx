"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Star, X, Loader2 } from "lucide-react"
import { getProductRatingDetails, type ProductRatingDetail } from "@/app/actions/ratings"
import { RATING_AXES, type ProductRatingSummary } from "@/lib/ratings"

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < Math.round(value) ? "fill-amber-300 text-amber-300" : "fill-transparent text-ivory/25"}`}
        />
      ))}
    </span>
  )
}

export function RatingBadge({
  summary,
  productTitle,
  interactive = false,
}: {
  summary: ProductRatingSummary
  productTitle: string
  interactive?: boolean
}) {
  const [open, setOpen] = useState(false)
  const label = `Note ${summary.avgScore.toFixed(1)} sur 5, ${summary.count} avis`
  const pill = (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/15 px-2 py-0.5 ring-1 ring-amber-300/30">
      <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
      <span className="font-mono text-[11px] font-bold tabular-nums text-amber-200">{summary.avgScore.toFixed(1)}</span>
      <span className="font-mono text-[10px] text-ivory/45">({summary.count})</span>
    </span>
  )

  if (!interactive) {
    return <span aria-label={label}>{pill}</span>
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        aria-label={`${label}. Voir les avis de ${productTitle}`}
        className="text-left"
      >
        {pill}
      </button>
      {open && (
        <RatingDetails
          productId={summary.productId}
          productTitle={productTitle}
          summary={summary}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function RatingDetails({
  productId,
  productTitle,
  summary,
  onClose,
}: {
  productId: string
  productTitle: string
  summary: ProductRatingSummary
  onClose: () => void
}) {
  const [rows, setRows] = useState<ProductRatingDetail[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    getProductRatingDetails(productId)
      .then((list) => { if (!cancelled) setRows(list) })
      .catch(() => { if (!cancelled) setError("Impossible de charger les avis.") })
    return () => { cancelled = true }
  }, [productId])

  const dialog = (
    <div className="fixed inset-0 z-[260] flex items-end justify-center bg-void/80 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={`Avis ${productTitle}`}>
      <button type="button" className="absolute inset-0" aria-label="Fermer" onClick={onClose} />
      <div className="relative flex max-h-[80vh] w-full max-w-lg flex-col border border-white/10 bg-surface">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="font-display text-lg tracking-wide text-ivory">{productTitle}</p>
            <p className="mt-1 flex items-center gap-2 font-mono text-[11px] text-ivory/50">
              <Stars value={summary.avgScore} />
              {summary.avgScore.toFixed(1)} · {summary.count} avis
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-ivory/50 hover:text-ivory" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto px-5 py-4">
          {error && <p className="font-mono text-xs text-red-300">{error}</p>}
          {!rows && !error && (
            <p className="flex items-center gap-2 font-mono text-xs text-ivory/40">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement
            </p>
          )}
          {rows?.map((row) => (
            <article key={row.id} className="border border-white/10 bg-void/50 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs text-ivory">{row.pseudo}</p>
                <p className="font-mono text-[10px] text-ivory/35">
                  {new Date(row.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1">
                {RATING_AXES.map((axis) => (
                  <p key={axis.key} className="flex items-center justify-between gap-2 font-mono text-[10px] text-ivory/55">
                    <span>{axis.label}</span>
                    <Stars value={row[axis.key]} />
                  </p>
                ))}
              </div>
              {row.comment && <p className="mt-2 font-sans text-sm leading-relaxed text-ivory/75">{row.comment}</p>}
            </article>
          ))}
          {rows && rows.length === 0 && <p className="font-mono text-xs text-ivory/40">Aucun avis pour l'instant.</p>}
        </div>
      </div>
    </div>
  )

  if (typeof document === "undefined") return dialog
  return createPortal(dialog, document.body)
}
