import { redirect } from "next/navigation"
import { getCustomerToken } from "@/lib/auth"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { ProductSection } from "@/components/product-section"
import { LightningDivider } from "@/components/lightning-divider"
import { CartDrawer } from "@/components/cart-drawer"
import { Footer } from "@/components/footer"
import { getShopSections } from "@/app/actions/settings"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const token = await getCustomerToken()
  if (!token) redirect("/signup")

  const sections = await getShopSections()

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        {sections.map((sec, i) => (
          <div key={sec.slug}>
            <ProductSection config={sec} />
            {i < sections.length - 1 && <LightningDivider label="orage urbain" />}
          </div>
        ))}
      </main>
      <Footer />
      <CartDrawer />
    </>
  )
}
