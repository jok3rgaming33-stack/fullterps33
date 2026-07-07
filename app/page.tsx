import { redirect } from "next/navigation"
import { getCustomerToken } from "@/lib/auth"
import { getCurrentCustomer } from "@/app/actions/account"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { ProductSection } from "@/components/product-section"
import { LightningDivider } from "@/components/lightning-divider"
import { CheckoutCart } from "@/components/checkout-cart"
import { Footer } from "@/components/footer"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const token = await getCustomerToken()
  if (!token) redirect("/signup")

  const customer = await getCurrentCustomer()
  const userData = customer ? { pseudo: customer.pseudo, token: customer.token } : null

  return (
    <>
      <Navbar userData={userData} />
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
      <CheckoutCart userData={userData} />
    </>
  )
}
