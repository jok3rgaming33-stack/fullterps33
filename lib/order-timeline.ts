import { normalizeStatus, statusMeta, type OrderStatusKey } from "@/lib/order-status"

export type VisualStepIcon = "prep" | "ready" | "transit" | "arrived" | "delivered"

export type VisualStep = {
  key: OrderStatusKey
  match: OrderStatusKey[]
  label: string
  shortLabel: string
  icon: VisualStepIcon
}

const VISUAL_DELIVERY: VisualStep[] = [
  {
    key: "preparation",
    match: ["en_attente", "validee", "preparation"],
    label: "En préparation",
    shortLabel: "Prépa",
    icon: "prep",
  },
  {
    key: "bientot_livraison",
    match: ["bientot_livraison"],
    label: "Prêt pour la livraison",
    shortLabel: "Prêt",
    icon: "ready",
  },
  {
    key: "livraison",
    match: ["livraison"],
    label: "Livraison en cours",
    shortLabel: "En route",
    icon: "transit",
  },
  {
    key: "arrivee",
    match: ["arrivee"],
    label: "Arrivé à destination",
    shortLabel: "Sur place",
    icon: "arrived",
  },
  {
    key: "livree",
    match: ["livree"],
    label: "Livré",
    shortLabel: "Livré",
    icon: "delivered",
  },
]

const VISUAL_RETRAIT: VisualStep[] = [
  {
    key: "preparation",
    match: ["en_attente", "validee", "preparation"],
    label: "En préparation",
    shortLabel: "Prépa",
    icon: "prep",
  },
  {
    key: "pret_meetup",
    match: ["pret_meetup", "bientot_livraison"],
    label: "Prêt à récupérer",
    shortLabel: "Prêt",
    icon: "ready",
  },
  {
    key: "livree",
    match: ["livree"],
    label: "Remise",
    shortLabel: "Remise",
    icon: "delivered",
  },
]

export type OrderTrackingState = {
  history?: Partial<Record<string, string>>
  etaMin?: number | null
  etaAt?: string | null
  etaArriveBy?: string | null
  cancelReason?: string | null
}

export type VisualTimelineState = {
  steps: VisualStep[]
  currentIndex: number
  cancelled: boolean
  currentLabel: string
  caption: string
  detail: string | null
}

export function getVisualPipeline(fulfillment?: string | null): VisualStep[] {
  return (fulfillment || "").toLowerCase() === "meetup" ? VISUAL_RETRAIT : VISUAL_DELIVERY
}

function effectivePipelineKey(key: OrderStatusKey, fulfillment?: string | null): OrderStatusKey {
  const retrait = (fulfillment || "").toLowerCase() === "meetup"
  if (key === "pret_meetup" && !retrait) return "bientot_livraison"
  if (key === "bientot_livraison" && retrait) return "pret_meetup"
  if (key === "arrivee" && retrait) return "pret_meetup"
  if (key === "livraison" && retrait) return "pret_meetup"
  return key
}

export function getVisualTimelineState(
  status: string | null | undefined,
  fulfillment?: string | null,
  tracking?: OrderTrackingState | null,
): VisualTimelineState {
  const key = normalizeStatus(status)
  const steps = getVisualPipeline(fulfillment)
  const captionPack = getTrackingCaption(key, fulfillment, tracking)

  if (key === "annulee") {
    return {
      steps,
      currentIndex: -1,
      cancelled: true,
      currentLabel: statusMeta(key).label,
      caption: captionPack.title,
      detail: captionPack.detail,
    }
  }

  const effective = effectivePipelineKey(key, fulfillment)
  let currentIndex = steps.findIndex((s) => s.match.includes(effective) || s.key === effective)
  if (currentIndex < 0) currentIndex = 0

  return {
    steps,
    currentIndex,
    cancelled: false,
    currentLabel: statusMeta(key).label,
    caption: captionPack.title,
    detail: captionPack.detail,
  }
}

export function getTrackingCaption(
  status: string | null | undefined,
  fulfillment?: string | null,
  tracking?: OrderTrackingState | null,
): { title: string; detail: string | null } {
  const key = normalizeStatus(status)
  const retrait = (fulfillment || "").toLowerCase() === "meetup"

  switch (key) {
    case "en_attente":
      return { title: "Commande reçue.", detail: "En attente de validation." }
    case "validee":
      return { title: "Commande validée.", detail: "Préparation en cours." }
    case "preparation":
      return { title: "Tes articles sont en préparation.", detail: null }
    case "pret_meetup":
      return {
        title: "Colis prêt à récupérer.",
        detail: "Tu peux venir le récupérer au créneau prévu.",
      }
    case "bientot_livraison":
      return {
        title: "Bientôt en livraison.",
        detail: "Le livreur va bientôt prendre en charge ton colis.",
      }
    case "livraison":
      return { title: "Ton colis est en route.", detail: "Reste joignable." }
    case "arrivee":
      return { title: "Le livreur est arrivé à destination.", detail: "Sors ou reste joignable." }
    case "livree":
      return {
        title: retrait ? "Commande remise." : "Commande livrée.",
        detail: "Merci pour ta confiance.",
      }
    case "annulee":
      return {
        title: "Commande annulée.",
        detail: tracking?.cancelReason?.trim() || null,
      }
    default:
      return { title: statusMeta(key).label, detail: null }
  }
}

export function formatStepDate(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
}

export function dateForVisualStep(
  step: VisualStep,
  tracking?: OrderTrackingState | null,
  createdAt?: Date | string | null,
): string | null {
  const history = tracking?.history ?? {}
  for (const k of [...step.match].reverse()) {
    if (history[k]) return formatStepDate(history[k])
  }
  if (step.match.includes("en_attente") && createdAt) {
    return formatStepDate(typeof createdAt === "string" ? createdAt : createdAt.toISOString())
  }
  return null
}

/** « Mardi 11h » à partir de la date et du créneau enregistrés. */
export function formatScheduledLabel(date?: string | null, slot?: string | null): string | null {
  const parts: string[] = []
  if (date) {
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00` : date
    const d = new Date(iso)
    if (!Number.isNaN(d.getTime())) {
      const day = d.toLocaleDateString("fr-FR", { weekday: "long" })
      parts.push(day.charAt(0).toUpperCase() + day.slice(1))
    }
  }
  if (slot?.trim()) parts.push(slot.trim())
  return parts.length ? parts.join(" ") : null
}
