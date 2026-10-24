// Statuts de commande partagés entre l'admin et l'espace client.
// Les clés internes restent stables. Le libellé public du retrait ne dit jamais « meetup ».

export const ORDER_STATUS_DEFAULT = "en_attente"

export const VENDOR_STATUS_OPTIONS = [
  "validee",
  "preparation",
  "pret_meetup",
  "bientot_livraison",
  "livraison",
  "arrivee",
  "livree",
  "annulee",
] as const

export const VENDOR_DISCUSSION_STATUS_OPTIONS = [
  "pris_en_charge",
  "ouvert",
  "ferme",
] as const

export type OrderStatusKey =
  | "discussion"
  | "pris_en_charge"
  | "ouvert"
  | "ferme"
  | "en_attente"
  | "validee"
  | "preparation"
  | "pret_meetup"
  | "bientot_livraison"
  | "livraison"
  | "arrivee"
  | "livree"
  | "annulee"

export type StatusMeta = {
  label: string
  badge: string
  accent: string
  color: string
  bg: string
  ring: string
  next: OrderStatusKey | null
}

export const STATUS_META: Record<OrderStatusKey, StatusMeta> = {
  discussion: {
    label: "Discussion",
    badge: "bg-teal-500/15 text-teal-300 border border-teal-500/30",
    accent: "text-teal-300",
    color: "text-teal-300",
    bg: "bg-teal-500/10",
    ring: "ring-teal-500/30",
    next: "pris_en_charge",
  },
  pris_en_charge: {
    label: "Pris en charge",
    badge: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
    accent: "text-sky-400",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    ring: "ring-sky-500/30",
    next: "ouvert",
  },
  ouvert: {
    label: "Ouvert",
    badge: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    accent: "text-emerald-400",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    ring: "ring-emerald-400/30",
    next: "ferme",
  },
  ferme: {
    label: "Fermé",
    badge: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30",
    accent: "text-zinc-400",
    color: "text-zinc-400",
    bg: "bg-white/5",
    ring: "ring-white/15",
    next: null,
  },
  en_attente: {
    label: "En attente de validation",
    badge: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    accent: "text-amber-400",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    ring: "ring-amber-400/30",
    next: "validee",
  },
  validee: {
    label: "Validée",
    badge: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
    accent: "text-sky-400",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    ring: "ring-sky-500/30",
    next: "preparation",
  },
  preparation: {
    label: "En cours de préparation",
    badge: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
    accent: "text-orange-400",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    ring: "ring-orange-400/30",
    next: "pret_meetup",
  },
  pret_meetup: {
    label: "Colis prêt à récupérer",
    badge: "bg-violet-500/15 text-violet-300 border border-violet-500/30",
    accent: "text-violet-300",
    color: "text-violet-300",
    bg: "bg-violet-electric/10",
    ring: "ring-violet-electric/30",
    next: "livree",
  },
  bientot_livraison: {
    label: "Bientôt en livraison",
    badge: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
    accent: "text-blue-300",
    color: "text-blue-300",
    bg: "bg-blue-400/10",
    ring: "ring-blue-400/30",
    next: "livraison",
  },
  livraison: {
    label: "Livraison en cours",
    badge: "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30",
    accent: "text-indigo-300",
    color: "text-indigo-300",
    bg: "bg-indigo-400/10",
    ring: "ring-indigo-400/30",
    next: "arrivee",
  },
  arrivee: {
    label: "Arrivé à destination",
    badge: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30",
    accent: "text-cyan-300",
    color: "text-cyan-300",
    bg: "bg-cyan-400/10",
    ring: "ring-cyan-400/30",
    next: "livree",
  },
  livree: {
    label: "Livrée",
    badge: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    accent: "text-emerald-400",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    ring: "ring-emerald-400/30",
    next: null,
  },
  annulee: {
    label: "Annulée",
    badge: "bg-red-500/15 text-red-400 border border-red-500/30",
    accent: "text-red-400",
    color: "text-red-400",
    bg: "bg-red-500/10",
    ring: "ring-red-500/30",
    next: null,
  },
}

const LEGACY: Record<string, OrderStatusKey> = {
  nouveau: "en_attente",
  "en cours": "en_attente",
  en_cours: "en_attente",
  "en attente": "en_attente",
  confirmee: "validee",
  confirmée: "validee",
  "en préparation": "preparation",
  "en preparation": "preparation",
  pret: "pret_meetup",
  prêt: "pret_meetup",
  "en route": "livraison",
  en_route: "livraison",
  livre: "livree",
  livré: "livree",
  traité: "livree",
  traite: "livree",
  annule: "annulee",
  annulé: "annulee",
}

export function normalizeStatus(raw: string | null | undefined): OrderStatusKey {
  if (!raw) return "en_attente"
  const key = raw.trim().toLowerCase()
  if (key in STATUS_META) return key as OrderStatusKey
  if (key in LEGACY) return LEGACY[key]
  return "en_attente"
}

export function statusMeta(raw: string | null | undefined): StatusMeta {
  return STATUS_META[normalizeStatus(raw)]
}

export const CLOSED_STATUSES: OrderStatusKey[] = ["livree", "annulee"]

export function isClosedStatus(raw: string | null | undefined): boolean {
  return CLOSED_STATUSES.includes(normalizeStatus(raw))
}

export const DISCUSSION_STATUSES: OrderStatusKey[] = ["discussion", "pris_en_charge", "ouvert", "ferme"]

export function isDiscussionStatus(raw: string | null | undefined): boolean {
  return DISCUSSION_STATUSES.includes(normalizeStatus(raw))
}

/** Options du menu déroulant : commande ou discussion, selon le fil. */
export function statusOptionsFor(raw: string | null | undefined): OrderStatusKey[] {
  const current = normalizeStatus(raw)
  if (isDiscussionStatus(raw)) {
    const list: OrderStatusKey[] = ["discussion", ...VENDOR_DISCUSSION_STATUS_OPTIONS]
    return list.includes(current) ? list : [current, ...list]
  }
  const list: OrderStatusKey[] = ["en_attente", ...VENDOR_STATUS_OPTIONS]
  return list.includes(current) ? list : [current, ...list]
}

export function fulfillmentLabel(raw: string | null | undefined): string {
  return (raw || "").toLowerCase() === "meetup" ? "Retrait" : "Livraison"
}
