"use client"

import { useState, useEffect } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { badgeStyles, findVariantForSize, type Product } from "@/lib/types"
import { formatPrice } from "@/lib/utils"
import { useCart } from "@/components/cart-provider"
import { BlobMedia } from "@/components/blob-media"

interface ProductModalProps {
  product: Product
  isOpen: boolean
  onClose: () => void
}

export function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  const [size, setSize] = useState(product.sizes[0])
  const { addToCart } = useCart()
  const disabled = product.status === "rupture" || product.status === "bientot"

  const activeVariant =
    findVariantForSize(product.variants ?? [], size) ??
    product.variants?.[0] ??
    null
  const displayPrice = activeVariant?.price ?? product.price

  const allMedia = [
    ...(product.image ? [product.image] : []),
    ...(product.media ?? []),
  ]
  const [mediaIndex, setMediaIndex] = useState(0)
  const currentMedia = allMedia[mediaIndex] ?? null

  // Fermeture sur Escape
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen, onClose])

  // Bloque le scroll du body
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-void/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 flex w-full max-w-3xl flex-col gap-0 border border-white/10 bg-surface shadow-2xl md:flex-row">
        {/* Bouton fermer */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center border border-white/10 bg-void/80 text-ivory/60 transition hover:text-ivory"
          aria-label="Fermer"
        >
          <X size={14} />
        </button>

        {/* Colonne médias */}
        <div className="relative flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-surface2 to-void md:w-80 md:aspect-auto md:h-auto">
          {product.badge && (
            <span className={`clip-tag absolute left-3 top-3 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wide ${badgeStyles[product.badge]}`}>
              {product.badge}
            </span>
          )}

          {currentMedia ? (
            <BlobMedia
              src={currentMedia}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <svg viewBox="0 0 100 100" className="h-24 w-24 text-violet-electric/20">
              <path d="M35 15 L50 8 L65 15 L78 25 L70 35 L65 30 L65 90 L35 90 L35 30 L30 35 L22 25 Z" fill="currentColor" />
            </svg>
          )}

          {/* Navigation carrousel */}
          {allMedia.length > 1 && (
            <>
              <button
                onClick={() => setMediaIndex((i) => (i - 1 + allMedia.length) % allMedia.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-void/70 p-1 text-ivory transition hover:bg-void"
                aria-label="Précédent"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setMediaIndex((i) => (i + 1) % allMedia.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-void/70 p-1 text-ivory transition hover:bg-void"
                aria-label="Suivant"
              >
                <ChevronRight size={16} />
              </button>
              {/* Thumbnails */}
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {allMedia.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setMediaIndex(idx)}
                    className={`h-1.5 rounded-full transition-all ${idx === mediaIndex ? "w-5 bg-violet-electric" : "w-1.5 bg-white/30 hover:bg-white/60"}`}
                    aria-label={`Média ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Colonne infos */}
        <div className="flex flex-1 flex-col gap-5 p-6">
          <div>
            <h2 className="font-display text-2xl leading-tight tracking-wide text-ivory">{product.name}</h2>
            <p className="mt-0.5 font-mono text-[11px] uppercase tracking-widest text-ivory/40">{product.sku}</p>
          </div>

          {product.description && (
            <p className="font-sans text-sm leading-relaxed text-ivory/70">{product.description}</p>
          )}

          {/* Tailles */}
          {product.sizes.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Format</p>
              <div className="flex flex-wrap gap-1.5">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide transition ${
                      size === s
                        ? "border-violet-electric bg-violet-electric/15 text-violet-electric"
                        : "border-white/15 text-ivory/60 hover:border-white/40"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Variantes — prix par format */}
          {(product.variants?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Tarifs</p>
              <div className="flex flex-col gap-1">
                {product.variants.map((v, i) => (
                  <div key={i} className="flex items-center justify-between font-mono text-xs">
                    <span className="text-ivory/60">{v.label}</span>
                    <span className="text-ivory">{formatPrice(v.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-4">
            <span className="font-mono text-2xl font-bold text-ivory">{formatPrice(displayPrice)}</span>
            <button
              disabled={disabled}
              onClick={() => { addToCart(product, size, displayPrice); onClose() }}
              className="clip-tag bg-violet-electric px-6 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-void transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-ivory/30"
            >
              {disabled ? "Indisponible" : "Ajouter au panier"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
