import type { Metadata } from "next"
import { Anton, Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { CartProvider } from "@/components/cart-provider"
import { NewsPopupLoader } from "@/components/news-popup"
import { ServiceWorkerRegistrar } from "@/components/sw-register"

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

export const metadata: Metadata = {
  title: "BRUMÉCO — E-liquides éco-durables",
  description:
    "E-boutique d'e-liquides pour cigarette électronique. Flacons rechargeables, formules suivies. Réservé aux 18 ans et plus.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="bg-void">
      <body className={`${anton.variable} ${inter.variable} ${jbmono.variable} font-body bg-void text-ivory antialiased`}>
        <CartProvider>{children}</CartProvider>
        <NewsPopupLoader />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  )
}
