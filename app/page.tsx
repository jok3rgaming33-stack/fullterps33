import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { ProductSection } from "@/components/product-section"
import { LightningDivider } from "@/components/lightning-divider"
import { CartDrawer } from "@/components/cart-drawer"
import { Footer } from "@/components/footer"

export const dynamic = "force-dynamic"

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ProductSection
          config={{
            id: "capsule",
            category: "capsule",
            eyebrow: "En vedette",
            title: "Édition Capsule",
            gridCols: "md:grid-cols-4",
          }}
        />
        <LightningDivider label="orage urbain" />
        <ProductSection
          config={{
            id: "nouveautes",
            category: "nouveautes",
            eyebrow: "Fraîchement débarqué",
            title: "Nouveautés",
            gridCols: "md:grid-cols-4",
          }}
        />
      </main>
      <Footer />
      <CartDrawer />
    </>
  )
}
