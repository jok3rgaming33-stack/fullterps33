export const ORDER_STATUSES = [
  "En attente",
  "En préparation",
  "Prêt",
  "En route",
  "Livré",
  "Annulé",
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const STATUS_META: Record<
  OrderStatus,
  { label: string; color: string; bg: string; ring: string; next: OrderStatus | null }
> = {
  "En attente": {
    label: "En attente",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    ring: "ring-amber-400/30",
    next: "En préparation",
  },
  "En préparation": {
    label: "En préparation",
    color: "text-violet-electric",
    bg: "bg-violet-electric/10",
    ring: "ring-violet-electric/30",
    next: "Prêt",
  },
  "Prêt": {
    label: "Prêt",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    ring: "ring-emerald-400/30",
    next: "En route",
  },
  "En route": {
    label: "En route",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
    ring: "ring-sky-400/30",
    next: "Livré",
  },
  "Livré": {
    label: "Livré",
    color: "text-ivory/60",
    bg: "bg-white/5",
    ring: "ring-white/10",
    next: null,
  },
  "Annulé": {
    label: "Annulé",
    color: "text-signal",
    bg: "bg-signal/10",
    ring: "ring-signal/30",
    next: null,
  },
}

export function statusMeta(status: string) {
  return (
    STATUS_META[status as OrderStatus] ?? {
      label: status,
      color: "text-ivory/60",
      bg: "bg-white/5",
      ring: "ring-white/10",
      next: null,
    }
  )
}
