import { getPublicSiteRules, getSetting } from "@/app/actions/settings"
import { HeroStorm } from "@/components/hero-storm"
import { SignupBrandProvider } from "@/components/signup-brand"
import { SiteRulesProvider } from "@/components/site-rules-context"
import { StormBackground } from "@/components/storm-background"
import { BRAND_NAME, publicText } from "@/lib/brand"

export const dynamic = "force-dynamic"

async function signupName() {
  try { return publicText(await getSetting("site_name"), BRAND_NAME) } catch { return BRAND_NAME }
}

export async function generateMetadata() {
  const name = await signupName()
  return {
    title: `Créer un compte | ${name}`,
    description: `Crée ton compte ${name}. Vente d'e-liquides réservée aux 18 ans et plus.`,
  }
}

export default async function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [name, rules] = await Promise.all([signupName(), getPublicSiteRules()])
  return (
    <div className="relative min-h-screen overflow-hidden bg-void">
      <StormBackground />
      {/* Assombrit le fond côté formulaire (gauche en desktop, partout en mobile) */}
      <div className="pointer-events-none absolute inset-0 bg-void/55 lg:bg-transparent lg:bg-gradient-to-r lg:from-void/80 lg:via-void/45 lg:to-void/10" />
      <HeroStorm variant="signup" />
      <div className="relative z-20">
        <SignupBrandProvider name={name}>
          <SiteRulesProvider rules={rules}>{children}</SiteRulesProvider>
        </SignupBrandProvider>
      </div>
    </div>
  )
}
