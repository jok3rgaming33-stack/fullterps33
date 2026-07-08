"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { badgeStyles, type Product } from "@/lib/types"
import { formatPrice } from "@/lib/utils"
import { useCart } from "@/components/cart-provider"
import { BlobMedia } from "@/components/blob-media"

export function ProductCard({ product }: { product: Product }) {
  const [size, setSize] = useState(product.sizes[0])
  const { addToCart } = useCart()
  const disabled = product.status === "rupture" || product.status === "bientot"

  // Tous les médias : image principale + galerie additionnelle
  const allMedia = [
    ...(product.image ? [product.image] : []),
    ...(product.media ?? []),
  ]
  const [mediaIndex, setMediaIndex] = useState(0)
  const currentMedia = allMedia[mediaIndex] ?? null

  return (
    <div className="clip-card group flex flex-col border border-white/10 bg-surface transition hover:border-violet-electric/50 hover:shadow-glow-sm">
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-surface2 to-void">
        {product.badge && (
          <span
            className={`clip-tag absolute left-3 top-3 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wide ${badgeStyles[product.badge]}`}
          >
            {product.badge}
          </span>
        )}

        {currentMedia ? (
          <BlobMedia
            src={currentMedia}
            alt={product.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          /* Placeholder quand aucun média */
          <svg viewBox="0 0 100 100" className="h-24 w-24 text-violet-electric/30 transition group-hover:text-violet-electric/50">
            <path
              d="M35 15 L50 8 L65 15 L78 25 L70 35 L65 30 L65 90 L35 90 L35 30 L30 35 L22 25 Z"
              fill="currentColor"
            />
          </svg>
        )}

        {/* Navigation carrousel si plusieurs médias */}
        {allMedia.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setMediaIndex((i) => (i - 1 + allMedia.length) % allMedia.length) }}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full bg-void/70 p-0.5 text-ivory opacity-0 transition group-hover:opacity-100"
              aria-label="Précédent"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMediaIndex((i) => (i + 1) % allMedia.length) }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-void/70 p-0.5 text-ivory opacity-0 transition group-hover:opacity-100"
              aria-label="Suivant"
            >
              <ChevronRight size={16} />
            </button>
            {/* Indicateurs */}
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
              {allMedia.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setMediaIndex(idx) }}
                  className={`h-1 rounded-full transition-all ${idx === mediaIndex ? "w-4 bg-violet-electric" : "w-1 bg-white/40"}`}
                  aria-label={`Média ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-display text-lg leading-tight tracking-wide text-ivory">{product.name}</h3>
          <p className="font-mono text-[11px] uppercase tracking-widest text-ivory/40">{product.sku}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {product.sizes.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-wide transition ${
                size === s
                  ? "border-violet-electric bg-violet-electric/15 text-violet-electric"
                  : "border-white/15 text-ivory/60 hover:border-white/40"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-mono text-base font-bold text-ivory">{formatPrice(product.price)}</span>
          <button
            disabled={disabled}
            onClick={() => addToCart(product, size)}
            className="clip-tag bg-violet-electric px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-void transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-ivory/30"
          >
            {disabled ? "Indisponible" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  )
}
