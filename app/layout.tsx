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
  title: "FULLTERPS33 — Streetwear",
  description: "Édition capsule streetwear FULLTERPS33. Orage urbain, coupes larges, éclairs violets.",
  icons: {
    icon: "/images/logomini.png",
    apple: "/images/logomini.png",
    shortcut: "/images/logomini.png",
  },
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
