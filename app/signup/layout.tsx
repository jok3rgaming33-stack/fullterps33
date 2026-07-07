import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const dynamic = "force-dynamic"

export const metadata = {
  title: 'Créer un compte | FULLTERPS33',
  description: 'Crée ton compte FULLTERPS33 en un clic avec un TOKEN unique',
}

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}
