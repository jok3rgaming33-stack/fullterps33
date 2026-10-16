export type StockStatus = "disponible" | "rupture" | "bientot" | "reappro"

export type Product = {
  id: string
  name: string
  price: number
  category: "capsule" | "nouveautes"
  status: StockStatus
  badge?: "Best-seller" | "Rupture de stock" | "Bientôt dispo" | "En réappro"
  sizes: string[]
  sku: string
  image: string
}

export const products: Product[] = [
  {
    id: "menthe-froide",
    name: "Menthe froide 50 ml",
    price: 18,
    category: "capsule",
    status: "disponible",
    badge: "Best-seller",
    sizes: ["0 mg", "3 mg", "6 mg"],
    sku: "BE-EL-001",
    image: "menthe",
  },
  {
    id: "pomme-verte",
    name: "Pomme verte 50 ml",
    price: 18,
    category: "capsule",
    status: "disponible",
    sizes: ["0 mg", "3 mg", "6 mg"],
    sku: "BE-EL-002",
    image: "pomme",
  },
  {
    id: "tabac-blond",
    name: "Tabac blond 10 ml",
    price: 6,
    category: "capsule",
    status: "disponible",
    sizes: ["3 mg", "6 mg", "12 mg"],
    sku: "BE-EL-003",
    image: "tabac",
  },
  {
    id: "fruits-rouges",
    name: "Fruits rouges 50 ml",
    price: 19,
    category: "nouveautes",
    status: "disponible",
    badge: "Bientôt dispo",
    sizes: ["0 mg", "3 mg"],
    sku: "BE-EL-004",
    image: "fruits",
  },
  {
    id: "flacon-verre",
    name: "Flacon verre recharge 50 ml",
    price: 4,
    category: "nouveautes",
    status: "disponible",
    sizes: ["50 ml"],
    sku: "BE-FL-001",
    image: "flacon",
  },
]

export const badgeStyles: Record<NonNullable<Product["badge"]>, string> = {
  "Best-seller": "bg-violet-electric text-void",
  "Rupture de stock": "bg-white/10 text-ivory/70 border border-white/20",
  "Bientôt dispo": "bg-violet-deep text-ivory",
  "En réappro": "bg-signal text-void",
}
