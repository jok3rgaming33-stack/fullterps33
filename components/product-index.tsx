import { listProducts } from "@/app/actions/products"
import { getShopSections } from "@/app/actions/settings"
import { isAdmin } from "@/lib/auth"
import { isForbiddenCopy, visibleShopText } from "@/lib/brand"
import { ProductIndexNav, type IndexEntry } from "@/components/product-index-nav"

export async function ProductIndex() {
  const admin = await isAdmin()
  const [products, sections] = await Promise.all([listProducts(), getShopSections()])
  const entries: IndexEntry[] = []

  for (const section of sections) {
    const sectionTitle = visibleShopText(section.title, "Catalogue", admin)
    for (const product of products) {
      if (product.section !== section.slug) continue
      if (!admin && isForbiddenCopy(`${product.name} ${product.description ?? ""} ${product.category}`)) continue
      entries.push({
        id: product.id,
        title: product.name,
        sectionTitle,
        featured: product.badges.includes("nouveaute") || product.badges.includes("bestseller"),
      })
    }
  }

  return <ProductIndexNav entries={entries} />
}
