export type BadgeKey =
  | "nouveaute"
  | "bestseller"
  | "promo"
  | "exclusif"
  | "rupture"
  | "bientot"
  | "limité"
  | "premium"

export interface BadgeConfig {
  label: string
  color: string      // bg color class
  text: string       // text color class
  border: string     // border color class
}

export const BADGES: Record<BadgeKey, BadgeConfig> = {
  nouveaute: {
    label: "NOUVEAUTÉ",
    color: "bg-violet-electric",
    text: "text-void",
    border: "border-violet-soft",
  },
  bestseller: {
    label: "BEST SELLER",
    color: "bg-amber-300",
    text: "text-black",
    border: "border-amber-100",
  },
  promo: {
    label: "PROMO",
    color: "bg-orange-500",
    text: "text-black",
    border: "border-orange-300",
  },
  exclusif: {
    label: "EXCLUSIF",
    color: "bg-zinc-950",
    text: "text-violet-soft",
    border: "border-violet-electric",
  },
  rupture: {
    label: "RUPTURE",
    color: "bg-red-600",
    text: "text-white",
    border: "border-red-300",
  },
  bientot: {
    label: "BIENTÔT",
    color: "bg-amber-400",
    text: "text-black",
    border: "border-amber-200",
  },
  "limité": {
    label: "ÉDITION LIMITÉE",
    color: "bg-fuchsia-600",
    text: "text-white",
    border: "border-fuchsia-300",
  },
  premium: {
    label: "PREMIUM",
    color: "bg-violet-deep",
    text: "text-white",
    border: "border-violet-soft",
  },
}

export const ALL_BADGE_KEYS = Object.keys(BADGES) as BadgeKey[]

export function getBadge(key: string): BadgeConfig | null {
  return BADGES[key as BadgeKey] ?? null
}
