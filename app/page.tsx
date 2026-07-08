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
  // Sécurité préservée et active pour le déploiement de production
  const token = await getCustomerToken()
  if (!token) redirect("/signup")

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        
        {/* Première section mise à jour avec le titre de la capture d'écran */}
        <ProductSection
          config={{
            id: "capsule",
            category: "capsule",
            eyebrow: "En vedette",
            title: "Notre Menu",
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