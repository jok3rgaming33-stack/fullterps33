// Script d'installation de la base de données.
// Usage : node scripts/setup-db.mjs
// Nécessite DATABASE_URL dans .env.local (ou variable d'environnement).

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import postgres from "postgres"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Charge .env.local à la main (pas de dépendance dotenv nécessaire)
try {
  const envPath = join(__dirname, "..", ".env.local")
  const envFile = readFileSync(envPath, "utf-8")
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    if (!process.env[key]) process.env[key] = value
  }
} catch {
  // Pas de .env.local, on suppose que les variables sont déjà exportées
}

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL manquant. Ajoutez-le dans .env.local ou en variable d'environnement.")
  process.exit(1)
}

const sql = postgres(process.env.DATABASE_URL, { ssl: "require" })

const schema = readFileSync(join(__dirname, "..", "db", "schema.sql"), "utf-8")

const demoProducts = [
  { id: "hoodie-eclair", name: "Hoodie Éclair Violet", price: 79, category: "capsule", status: "disponible", badge: "Best-seller", sizes: ["S", "M", "L", "XL"], sku: "FT33-HD-001", image: "hoodie" },
  { id: "veste-orage", name: "Veste Orage Urbain", price: 139, category: "capsule", status: "reappro", badge: "En réappro", sizes: ["M", "L", "XL"], sku: "FT33-VS-014", image: "veste" },
  { id: "cargo-33", name: "Cargo 33 Nightrun", price: 94, category: "capsule", status: "rupture", badge: "Rupture de stock", sizes: ["S", "M", "L"], sku: "FT33-CG-033", image: "cargo" },
  { id: "tee-fissure", name: "Tee Fissure Néon", price: 39, category: "capsule", status: "bientot", badge: "Bientôt dispo", sizes: ["S", "M", "L", "XL"], sku: "FT33-TS-007", image: "tee" },
  { id: "casquette-masque", name: "Casquette Masque", price: 45, category: "nouveautes", status: "disponible", badge: null, sizes: ["Unique"], sku: "FT33-CQ-021", image: "casquette" },
  { id: "short-foudre", name: "Short Foudre", price: 55, category: "nouveautes", status: "disponible", badge: null, sizes: ["S", "M", "L"], sku: "FT33-SH-009", image: "short" },
  { id: "sac-banane", name: "Sac Banane Blackout", price: 49, category: "nouveautes", status: "disponible", badge: null, sizes: ["Unique"], sku: "FT33-SC-042", image: "sac" },
  { id: "chaussettes-33", name: "Chaussettes Pack x3", price: 19, category: "nouveautes", status: "disponible", badge: null, sizes: ["Unique"], sku: "FT33-CH-011", image: "chaussettes" },
]

async function main() {
  console.log("→ Création des tables…")
  await sql.unsafe(schema)
  console.log("✓ Tables prêtes")

  const [{ count }] = await sql`select count(*)::int as count from products`
  if (count === 0) {
    console.log("→ Insertion des produits de démonstration…")
    for (const p of demoProducts) {
      await sql`
        insert into products (id, name, price, category, status, badge, sizes, sku, image)
        values (${p.id}, ${p.name}, ${p.price}, ${p.category}, ${p.status}, ${p.badge}, ${p.sizes}, ${p.sku}, ${p.image})
        on conflict (id) do nothing
      `
    }
    console.log(`✓ ${demoProducts.length} produits insérés`)
  } else {
    console.log(`→ ${count} produits déjà présents, insertion ignorée`)
  }

  console.log("✓ Base de données prête")
  await sql.end()
}

main().catch((err) => {
  console.error("❌ Erreur :", err)
  process.exit(1)
})
