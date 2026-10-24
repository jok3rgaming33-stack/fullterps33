import type { Metadata } from "next"
import { Anton, Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { CartProvider } from "@/components/cart-provider"
import { NewsPopupLoader } from "@/components/news-popup"
import { ServiceWorkerRegistrar } from "@/components/sw-register"
import { ConnectionPrompts } from "@/components/connection-prompts"
import { getSetting } from "@/app/actions/settings"
import { BRAND_NAME, publicText } from "@/lib/brand"

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const jbmono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
})

export const dynamic = "force-dynamic"

// Titre de l'onglet / de l'appli : suit « Nom du site » des Réglages.
export async function generateMetadata(): Promise<Metadata> {
  let name = BRAND_NAME
  try { name = publicText(await getSetting("site_name"), BRAND_NAME) } catch {}
  return {
    title: `${name} — N°1 du 33`,
    description:
      "E-boutique d'e-liquides pour cigarette électronique. Flacons rechargeables, formules suivies. Réservé aux 18 ans et plus.",
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="bg-void">
      <body className={`${anton.variable} ${inter.variable} ${jbmono.variable} font-body bg-void text-ivory antialiased`}>
        <CartProvider>{children}</CartProvider>
        <ConnectionPrompts />
        <NewsPopupLoader />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  )
}
