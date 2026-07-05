import { products, type Product } from "@/lib/products"
import { ProductCard } from "@/components/product-card"

type SectionConfig = {
  id: string
  category: Product["category"]
  eyebrow: string
  title: string
  gridCols: string
}

export function ProductSection({ config }: { config: SectionConfig }) {
  const items = products.filter((p) => p.category === config.category)

  return (
    <section id={config.id} className="mx-auto max-w-[1200px] px-4 py-16">
      <div className="mb-8 flex items-end justify-between border-b border-white/10 pb-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-violet-electric">
            {config.eyebrow}
          </span>
          <h2 className="mt-2 font-display text-3xl tracking-wide text-ivory md:text-4xl">
            {config.title}
          </h2>
        </div>
        <span className="hidden font-mono text-xs text-ivory/40 md:block">
          {items.length} pièces
        </span>
      </div>

      <div className={`grid gap-5 grid-cols-2 ${config.gridCols}`}>
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}
