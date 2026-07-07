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
    color: "bg-violet-600",
    text: "text-white",
    border: "border-violet-400",
  },
  bestseller: {
    label: "BEST SELLER",
    color: "bg-amber-500",
    text: "text-black",
    border: "border-amber-300",
  },
  promo: {
    label: "PROMO",
    color: "bg-red-600",
    text: "text-white",
    border: "border-red-400",
  },
  exclusif: {
    label: "EXCLUSIF",
    color: "bg-zinc-900",
    text: "text-violet-300",
    border: "border-violet-600",
  },
  rupture: {
    label: "RUPTURE",
    color: "bg-zinc-700",
    text: "text-zinc-300",
    border: "border-zinc-500",
  },
  bientot: {
    label: "BIENTÔT",
    color: "bg-zinc-800",
    text: "text-zinc-400",
    border: "border-zinc-600",
  },
  "limité": {
    label: "ÉDITION LIMITÉE",
    color: "bg-fuchsia-700",
    text: "text-white",
    border: "border-fuchsia-400",
  },
  premium: {
    label: "PREMIUM",
    color: "bg-gradient-to-r from-violet-700 to-fuchsia-700",
    text: "text-white",
    border: "border-violet-400",
  },
}

export const ALL_BADGE_KEYS = Object.keys(BADGES) as BadgeKey[]

export function getBadge(key: string): BadgeConfig | null {
  return BADGES[key as BadgeKey] ?? null
}
