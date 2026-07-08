import { redirect } from "next/navigation"
import { getCustomerToken } from "@/lib/auth"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { ProductSection } from "@/components/product-section"
import { LightningDivider } from "@/components/lightning-divider"
import { Footer } from "@/components/footer"
import { getShopSections } from "@/app/actions/settings"
import { getCurrentCustomer } from "@/app/actions/account"
import { CheckoutCart } from "@/components/checkout-cart"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const token = await getCustomerToken()
  if (!token) redirect("/signup")

  const [sections, customer] = await Promise.all([
    getShopSections(),
    getCurrentCustomer(),
  ])

  const userData = customer ? { pseudo: customer.pseudo, token: customer.token } : null

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
      <CheckoutCart userData={userData} />
    </>
  )
}
