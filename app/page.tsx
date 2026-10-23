import { redirect } from "next/navigation"
import { getCustomerToken, isAdmin } from "@/lib/auth"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { ProductSection } from "@/components/product-section"
import { LightningDivider } from "@/components/lightning-divider"
import { Footer } from "@/components/footer"
import { getShopSections } from "@/app/actions/settings"
import { getCurrentCustomer } from "@/app/actions/account"
import { CheckoutCart } from "@/components/checkout-cart"

export const dynamic = "force-dynamic"

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { apercu?: string }
}) {
  const token = await getCustomerToken()
  // Aperçu admin : un administrateur authentifié (cookie admin vérifié côté
  // serveur) peut voir la vitrine sans compte client. Les visiteurs sans
  // compte client ni session admin valide restent redirigés vers /signup.
  const admin = await isAdmin()
  if (!token && !admin) redirect("/signup")
  const adminPreview = admin && (!token || searchParams?.apercu === "admin")

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
      {adminPreview && (
        <div
          className="pointer-events-none fixed bottom-3 left-3 z-[60] flex items-center gap-1.5 border border-violet-electric/40 bg-void/85 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-violet-electric backdrop-blur"
          aria-label="Aperçu admin"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-violet-electric shadow-[0_0_6px_#B355FF]" />
          Aperçu admin
        </div>
      )}
    </>
  )
}
