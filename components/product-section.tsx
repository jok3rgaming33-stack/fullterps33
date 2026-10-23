import type { Product } from "@/lib/types"
import { ProductCard } from "@/components/product-card"
import { listProducts } from "@/app/actions/products"
import type { ShopSection } from "@/app/actions/settings"
import { isAdmin } from "@/lib/auth"
import { isForbiddenCopy, visibleShopText } from "@/lib/brand"

export async function ProductSection({ config }: { config: ShopSection }) {
  const admin = await isAdmin()
  const items = (await listProducts(config.slug)).filter(
    (p) => admin || !isForbiddenCopy(`${p.name} ${p.description ?? ""} ${p.category}`),
  )
  const eyebrow = visibleShopText(config.eyebrow, "En vedette", admin)
  const title   = visibleShopText(config.title, "Les classiques", admin)

  return (
    <section id={config.slug} className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8 flex items-end justify-between border-b border-white/10 pb-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-violet-electric">
            {eyebrow}
          </span>
          <h2 className="mt-2 font-display text-3xl tracking-wide text-ivory md:text-4xl">
            {title}
          </h2>
        </div>
        <span className="hidden font-mono text-xs text-ivory/40 md:block">
          {items.length} produits
        </span>
      </div>

      {items.length === 0 ? (
        <p className="font-mono text-sm text-ivory/40">
          Aucun produit pour l'instant. Ajoutez-en depuis le panel admin.
        </p>
      ) : (
        <div className={`grid grid-cols-2 gap-3 sm:gap-5 ${config.gridCols}`}>
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  )
}
