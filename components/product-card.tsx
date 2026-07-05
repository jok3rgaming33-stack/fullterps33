"use client"

import { useState } from "react"
import { badgeStyles, type Product } from "@/lib/products"
import { formatPrice } from "@/lib/utils"
import { useCart } from "@/components/cart-provider"

export function ProductCard({ product }: { product: Product }) {
  const [size, setSize] = useState(product.sizes[0])
  const { addToCart } = useCart()
  const disabled = product.status === "rupture" || product.status === "bientot"

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
        {/* Placeholder garment silhouette */}
        <svg viewBox="0 0 100 100" className="h-24 w-24 text-violet-electric/30 transition group-hover:text-violet-electric/50">
          <path
            d="M35 15 L50 8 L65 15 L78 25 L70 35 L65 30 L65 90 L35 90 L35 30 L30 35 L22 25 Z"
            fill="currentColor"
          />
        </svg>
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
