import Link from "next/link"
import { getSetting } from "@/app/actions/settings"
import { AGE_NOTE, BRAND_NAME, FOOTER_TAGLINE, publicText } from "@/lib/brand"

export async function Footer() {
  const [tagline, copyright, siteName] = await Promise.all([
    getSetting("footer_tagline"),
    getSetting("footer_copyright"),
    getSetting("site_name"),
  ])

  const footerTagline   = publicText(tagline, FOOTER_TAGLINE)
  const footerCopyright = publicText(copyright, `© ${new Date().getFullYear()} ${BRAND_NAME} — Tous droits réservés`)
  const name            = publicText(siteName, BRAND_NAME)

  return (
    <footer className="border-t border-white/10 bg-void">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:justify-between">
        <div>
          <span className="font-display text-lg tracking-wide">{name}</span>
          <p className="mt-2 max-w-xs font-mono text-xs text-ivory/40">
            {footerTagline}
          </p>
          <p className="mt-2 max-w-xs font-mono text-[10px] leading-relaxed text-ivory/30">
            {AGE_NOTE}
          </p>
        </div>

        <div className="flex gap-12">
          <div className="flex flex-col gap-2 font-mono text-xs uppercase tracking-widest text-ivory/60">
            <span className="mb-1 text-ivory/30">Boutique</span>
            <Link href="/#vedette" className="hover:text-violet-electric">Nos produits</Link>
            <Link href="/#nouveautes" className="hover:text-violet-electric">Nouveautés</Link>
          </div>
          <div className="flex flex-col gap-2 font-mono text-xs uppercase tracking-widest text-ivory/60">
            <span className="mb-1 text-ivory/30">Compte</span>
            <Link href="/compte" className="hover:text-violet-electric">Mon Compte</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/5 px-4 py-4 text-center font-mono text-[10px] uppercase tracking-widest text-ivory/30">
        {footerCopyright}
      </div>
    </footer>
  )
}
