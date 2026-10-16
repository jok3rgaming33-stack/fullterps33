import Link from "next/link"
import { getSetting } from "@/app/actions/settings"
import { BRAND_NAME, HERO_BODY, HERO_CTA, HERO_EYEBROW, publicText } from "@/lib/brand"

export async function Hero() {
  const [eyebrow, body, cta, siteName] = await Promise.all([
    getSetting("hero_eyebrow"),
    getSetting("hero_body"),
    getSetting("hero_cta_label"),
    getSetting("site_name"),
  ])

  return (
    <section className="relative min-h-[80vh] md:min-h-screen w-full overflow-hidden border-b border-white/10 flex items-center">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/hero-still.jpg)" }}
        role="img"
        aria-label="Flacons d'e-liquide et feuillage"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-void via-void/55 to-void/75 z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-void/85 via-void/35 to-void/20 z-10 hidden md:block" />

      <div className="relative z-20 mx-auto w-full max-w-[1200px] px-6 py-12 md:py-24 flex flex-col justify-center">
        <p className="font-display text-5xl tracking-wide text-ivory sm:text-6xl md:text-7xl mb-4 md:mb-6">
          {publicText(siteName, BRAND_NAME)}
        </p>

        <div className="max-w-xl">
          <span className="mb-3 block font-mono text-xs uppercase tracking-[0.35em] text-violet-electric font-bold">
            {publicText(eyebrow, HERO_EYEBROW)}
          </span>
          <p className="font-body text-sm md:text-base leading-relaxed text-ivory/80 drop-shadow-md">
            {publicText(body, HERO_BODY)}
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="#vedette"
              className="clip-tag bg-violet-electric px-8 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-void shadow-glow transition hover:brightness-110 text-center min-w-[160px]"
            >
              {publicText(cta, HERO_CTA)}
            </Link>
            <Link
              href="#nouveautes"
              className="border border-white/20 bg-void/40 backdrop-blur-sm px-8 py-3 font-mono text-xs uppercase tracking-[0.2em] text-ivory/80 transition hover:border-violet-electric hover:text-violet-electric text-center min-w-[160px]"
            >
              Nouveautés
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
