import { BADGES, type BadgeKey } from "@/lib/badges"
import type { Product } from "@/lib/types"

const LEGACY: Record<string, BadgeKey> = {
  "best-seller": "bestseller",
  "rupture de stock": "rupture",
  "bientôt dispo": "bientot",
  "bientot dispo": "bientot",
  "en réappro": "bientot",
  "en reappro": "bientot",
}

export function productBadgeKeys(product: Product): BadgeKey[] {
  const keys: BadgeKey[] = []
  const push = (key: BadgeKey) => {
    if (!keys.includes(key)) keys.push(key)
  }
  for (const key of product.badges ?? []) {
    if (key in BADGES) push(key)
  }
  const legacy = product.badge?.trim().toLowerCase()
  if (legacy && LEGACY[legacy]) push(LEGACY[legacy])
  if (product.status === "rupture") push("rupture")
  if (product.status === "bientot") push("bientot")
  return keys
}

export function ProductBadges({ product, compact = false }: { product: Product; compact?: boolean }) {
  const keys = productBadgeKeys(product)
  if (!keys.length) return null
  return (
    <div className={`pointer-events-none absolute left-2 top-2 z-10 flex max-w-[calc(100%-1rem)] flex-col items-start gap-1 ${compact ? "" : "left-3 top-3 gap-1.5"}`}>
      {keys.map((key) => {
        const badge = BADGES[key]
        return (
          <span
            key={key}
            className={`inline-block max-w-full rounded-md border px-1.5 py-0.5 text-left font-mono font-bold uppercase leading-tight tracking-wide shadow-sm ${
              compact ? "text-[8px] sm:text-[9px]" : "px-2 py-1 text-[10px]"
            } ${badge.color} ${badge.text} ${badge.border}`}
          >
            {badge.label}
          </span>
        )
      })}
    </div>
  )
}
