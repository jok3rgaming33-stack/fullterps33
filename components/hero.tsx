import Link from "next/link"
import Image from "next/image"
import { getSetting } from "@/app/actions/settings"

export async function Hero() {
  const [eyebrow, body, ctaLabel] = await Promise.all([
    getSetting("hero_eyebrow"),
    getSetting("hero_body"),
    getSetting("hero_cta_label"),
  ])

  const heroEyebrow  = (eyebrow  as string | null) ?? "Édition Capsule — Automne"
  const heroBody     = (body     as string | null) ?? "Coupes larges, matières lourdes, silhouette orage. Le streetwear pensé pour la rue, la nuit, et ce qui gronde au-dessus."
  const heroCtaLabel = (ctaLabel as string | null) ?? "Voir la collection"

  return (
    <section className="relative overflow-hidden border-b border-white/10">
      {/* Storm alley background photo */}
      <Image
        src="/images/hero-bg.png"
        alt=""
        fill
        priority
        className="object-cover object-center"
        aria-hidden="true"
      />
      {/* Readability gradients over the photo */}
      <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-void/70" />
      <div className="absolute inset-0 bg-gradient-to-r from-void/60 via-transparent to-void/60" />

      <div className="relative mx-auto flex max-w-[1200px] flex-col px-4 pt-10 md:pt-16">
        <div className="relative flex items-center justify-center md:justify-start">
          <div className="relative h-[280px] w-[280px] shrink-0 drop-shadow-[0_0_40px_rgba(179,85,255,0.25)] sm:h-[360px] sm:w-[360px] md:h-[440px] md:w-[440px]">
            <Image
              src="/images/hero-guy.png"
              alt="Silhouette FULLTERPS33"
              fill
              className="object-contain object-bottom"
              priority
            />
          </div>
          <div className="relative -ml-6 hidden h-[160px] w-[420px] md:block lg:h-[190px] lg:w-[520px]">
            <Image src="/images/hero-logo.png" alt="FULLTERPS33" fill className="object-contain" priority />
          </div>
        </div>

        {/* Mobile-only logo */}
        <div className="relative -mt-4 h-[90px] w-full md:hidden">
          <Image src="/images/hero-logo.png" alt="FULLTERPS33" fill className="object-contain" priority />
        </div>

        <div className="relative z-10 -mt-6 max-w-xl pb-20 md:-mt-4 md:pb-28">
          <span className="mb-3 block font-mono text-xs uppercase tracking-[0.35em] text-violet-electric">
            {heroEyebrow}
          </span>
          <p className="font-body text-base leading-relaxed text-ivory/70 md:text-lg">
            {heroBody}
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="#capsule"
              className="clip-tag bg-violet-electric px-8 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-void shadow-glow transition hover:brightness-110"
            >
              {heroCtaLabel}
            </Link>
            <Link
              href="#nouveautes"
              className="border border-white/20 px-8 py-3 font-mono text-xs uppercase tracking-[0.2em] text-ivory/80 transition hover:border-violet-electric hover:text-violet-electric"
            >
              Nouveautés
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
