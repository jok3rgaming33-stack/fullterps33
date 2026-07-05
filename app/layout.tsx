import type { Metadata } from "next"
import { Anton, Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { CartProvider } from "@/components/cart-provider"

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

export const metadata: Metadata = {
  title: "FULLTERPS33 — Streetwear",
  description: "Édition capsule streetwear FULLTERPS33. Orage urbain, coupes larges, éclairs violets.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${anton.variable} ${inter.variable} ${jbmono.variable} font-body bg-void text-ivory antialiased`}>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  )
}
