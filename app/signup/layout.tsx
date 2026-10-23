import { HeroStorm } from "@/components/hero-storm"
import { StormBackground } from "@/components/storm-background"

export const dynamic = "force-dynamic"

export const metadata = {
  title: 'Créer un compte | BRUMÉCO',
  description: 'Crée ton compte BRUMÉCO. Vente d\'e-liquides réservée aux 18 ans et plus.',
}

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-void">
      <StormBackground />
      {/* Assombrit le fond côté formulaire (gauche en desktop, partout en mobile) */}
      <div className="pointer-events-none absolute inset-0 bg-void/55 lg:bg-transparent lg:bg-gradient-to-r lg:from-void/80 lg:via-void/45 lg:to-void/10" />
      <HeroStorm variant="signup" />
      <div className="relative z-20">
        {children}
      </div>
    </div>
  )
}
