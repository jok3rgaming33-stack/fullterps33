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
    id: "hoodie-eclair",
    name: "Hoodie Éclair Violet",
    price: 79,
    category: "capsule",
    status: "disponible",
    badge: "Best-seller",
    sizes: ["S", "M", "L", "XL"],
    sku: "FT33-HD-001",
    image: "hoodie",
  },
  {
    id: "veste-orage",
    name: "Veste Orage Urbain",
    price: 139,
    category: "capsule",
    status: "reappro",
    badge: "En réappro",
    sizes: ["M", "L", "XL"],
    sku: "FT33-VS-014",
    image: "veste",
  },
  {
    id: "cargo-33",
    name: "Cargo 33 Nightrun",
    price: 94,
    category: "capsule",
    status: "rupture",
    badge: "Rupture de stock",
    sizes: ["S", "M", "L"],
    sku: "FT33-CG-033",
    image: "cargo",
  },
  {
    id: "tee-fissure",
    name: "Tee Fissure Néon",
    price: 39,
    category: "capsule",
    status: "bientot",
    badge: "Bientôt dispo",
    sizes: ["S", "M", "L", "XL"],
    sku: "FT33-TS-007",
    image: "tee",
  },
  {
    id: "casquette-masque",
    name: "Casquette Masque",
    price: 45,
    category: "nouveautes",
    status: "disponible",
    sizes: ["Unique"],
    sku: "FT33-CQ-021",
    image: "casquette",
  },
  {
    id: "short-foudre",
    name: "Short Foudre",
    price: 55,
    category: "nouveautes",
    status: "disponible",
    sizes: ["S", "M", "L"],
    sku: "FT33-SH-009",
    image: "short",
  },
  {
    id: "sac-banane",
    name: "Sac Banane Blackout",
    price: 49,
    category: "nouveautes",
    status: "disponible",
    sizes: ["Unique"],
    sku: "FT33-SC-042",
    image: "sac",
  },
  {
    id: "chaussettes-33",
    name: "Chaussettes Pack x3",
    price: 19,
    category: "nouveautes",
    status: "disponible",
    sizes: ["Unique"],
    sku: "FT33-CH-011",
    image: "chaussettes",
  },
]

export const badgeStyles: Record<NonNullable<Product["badge"]>, string> = {
  "Best-seller": "bg-violet-electric text-void",
  "Rupture de stock": "bg-white/10 text-ivory/70 border border-white/20",
  "Bientôt dispo": "bg-violet-deep text-ivory",
  "En réappro": "bg-signal text-void",
}
