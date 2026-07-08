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
        
        {/* On ajoute 'as any' pour contourner le blocage de type sur Vercel */}
        <ProductSection
          config={{
            category: "vedette",
            eyebrow: "En vedette",
            title: "Notre Menu",
            gridCols: "md:grid-cols-4",
          } as any}
        />
        
        <LightningDivider label="orage urbain" />
        
        <ProductSection
          config={{
            category: "nouveautes",
            eyebrow: "Fraîchement débarqué",
            title: "Nouveautés",
            gridCols: "md:grid-cols-4",
          } as any}
        />
      </main>
      <Footer />
      <CartDrawer />
    </>
  )
}