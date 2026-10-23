import Link from "next/link"
import { getSetting } from "@/app/actions/settings"
import { HeroStorm } from "@/components/hero-storm"
import { StormBackground } from "@/components/storm-background"
import { isAdmin } from "@/lib/auth"
import { BRAND_NAME, HERO_BODY, HERO_CTA, HERO_EYEBROW, visibleShopText } from "@/lib/brand"

export async function Hero() {
  const [eyebrow, body, cta, siteName, navNouveautes, admin] = await Promise.all([
    getSetting("hero_eyebrow"),
    getSetting("hero_body"),
    getSetting("hero_cta_label"),
    getSetting("site_name"),
    getSetting("nav_label_nouveautes"),
    isAdmin(),
  ])
  const text = (value: unknown, fallback: string) => visibleShopText(value, fallback, admin)

  return (
    <section className="relative flex w-full items-center overflow-hidden border-b border-white/10 lg:min-h-[calc(100vh-69px)]">
      <StormBackground className="z-0" />

      <div className="absolute inset-0 bg-gradient-to-t from-void via-void/55 to-void/75 z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-void/85 via-void/35 to-void/20 z-10 hidden lg:block" />

      <HeroStorm />

      <div className="relative z-20 mx-auto flex w-full max-w-[1200px] flex-col justify-center px-4 pb-[calc(min(80vw,420px)*0.95+1.5rem)] pt-12 sm:px-6 sm:pt-16 lg:py-24">
        <p className="mb-4 font-display text-5xl tracking-wide text-ivory sm:text-6xl lg:mb-6 lg:text-7xl">
          {text(siteName, BRAND_NAME)}
        </p>

        <div className="max-w-xl lg:max-w-[46%]">
          <span className="mb-3 block font-mono text-xs uppercase tracking-[0.35em] text-violet-electric font-bold">
            {text(eyebrow, HERO_EYEBROW)}
          </span>
          <p className="font-body text-sm md:text-base leading-relaxed text-ivory/80 drop-shadow-md">
            {text(body, HERO_BODY)}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <Link
              href="#vedette"
              className="clip-tag bg-violet-electric px-8 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-void shadow-glow transition hover:brightness-110 text-center min-w-[160px]"
            >
              {text(cta, HERO_CTA)}
            </Link>
            <Link
              href="#nouveautes"
              className="border border-white/20 bg-void/40 backdrop-blur-sm px-8 py-3 font-mono text-xs uppercase tracking-[0.2em] text-ivory/80 transition hover:border-violet-electric hover:text-violet-electric text-center min-w-[160px]"
            >
              {text(navNouveautes, "Nouveautés")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
