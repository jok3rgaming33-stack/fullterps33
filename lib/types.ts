export type StockStatus = "disponible" | "rupture" | "bientot" | "reappro"

export type Product = {
  id: string
  name: string
  price: number
  category: "capsule" | "nouveautes"
  status: StockStatus
  badge: "Best-seller" | "Rupture de stock" | "Bientôt dispo" | "En réappro" | null
  sizes: string[]
  sku: string
  image: string
}

export const badgeStyles: Record<string, string> = {
  "Best-seller": "bg-violet-electric text-void",
  "Rupture de stock": "bg-white/10 text-ivory/70 border border-white/20",
  "Bientôt dispo": "bg-violet-deep text-ivory",
  "En réappro": "bg-signal text-void",
}
