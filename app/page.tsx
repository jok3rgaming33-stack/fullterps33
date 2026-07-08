import { redirect } from "next/navigation"
import { getCustomerToken } from "@/lib/auth"
import { getCurrentCustomer } from "@/app/actions/account"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { ProductSection } from "@/components/product-section"
import { LightningDivider } from "@/components/lightning-divider"
import { CheckoutCart } from "@/components/checkout-cart"
import { Footer } from "@/components/footer"
import { getShopSections } from "@/app/actions/settings"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const token = await getCustomerToken()
  if (!token) redirect("/signup")

  const [customer, sections] = await Promise.all([
    getCurrentCustomer(),
    getShopSections(),
  ])
  const userData = customer ? { pseudo: customer.pseudo, token: customer.token } : null

  return (
    <>
      <Navbar userData={userData} />
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
