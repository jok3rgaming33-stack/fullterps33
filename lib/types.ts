import type { BadgeKey } from "./badges"

export type StockStatus = "disponible" | "rupture" | "bientot" | "reappro"

export type ProductVariant = {
  qty: number   // quantity (e.g. 5g, 10g, 25g)
  price: number // price in cents
  label?: string // optional display label
}

export type DiscountType = "percent" | "fixed"

export type Product = {
  id: string
  name: string
  description: string | null
  price: number          // base price in cents (fallback)
  category: string
  status: StockStatus
  badge: string | null   // legacy single badge
  badges: BadgeKey[]     // new multi-badge system
  sizes: string[]
  sku: string
  stock: number
  image: string | null
  media: string[]        // additional images/videos URLs
  variants: ProductVariant[]
  discount_type: DiscountType | null
  discount_value: number | null
  sort_order: number
  section: string
  created_at: string
  updated_at: string
}

// Variants filtered to stock: only show qty <= stock
export function availableVariants(product: Product): ProductVariant[] {
  if (!product.variants?.length) return []
  return product.variants.filter((v) => v.qty <= product.stock)
}

// Compute effective price after discount
export function effectivePrice(basePrice: number, discountType: DiscountType | null, discountValue: number | null): number {
  if (!discountType || !discountValue) return basePrice
  if (discountType === "percent") return Math.round(basePrice * (1 - discountValue / 100))
  if (discountType === "fixed") return Math.max(0, basePrice - discountValue)
  return basePrice
}

// Format price from cents to display string
export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €"
}

// Legacy badge styles kept for backward compat
export const badgeStyles: Record<string, string> = {
  "Best-seller": "bg-violet-electric text-void",
  "Rupture de stock": "bg-white/10 text-ivory/70 border border-white/20",
  "Bientôt dispo": "bg-violet-deep text-ivory",
  "En réappro": "bg-signal text-void",
}
