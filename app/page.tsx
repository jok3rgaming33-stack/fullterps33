import { redirect } from "next/navigation"
import { getCustomerToken } from "@/lib/auth"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { ProductSection } from "@/components/product-section"
import { LightningDivider } from "@/components/lightning-divider"
import { CartDrawer } from "@/components/cart-drawer"
import { Footer } from "@/components/footer"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const token = await getCustomerToken()
  if (!token) redirect("/signup")

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        
        {/* Première section — Propriété 'id' retirée pour respecter le type ShopSection */}
        <ProductSection
          config={{
            category: "capsule",
            eyebrow: "En vedette",
            title: "Notre Menu",
            gridCols: "md:grid-cols-4",
          }}
        />
        
        <LightningDivider label="orage urbain" />
        
        {/* Deuxième section — Propriété 'id' retirée également */}
        <ProductSection
          config={{
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