import type { Metadata } from "next"
import { getPublicSiteRules, getSetting } from "@/app/actions/settings"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { BRAND_NAME, publicText } from "@/lib/brand"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  let name = BRAND_NAME
  try { name = publicText(await getSetting("site_name"), BRAND_NAME) } catch { /* nom par défaut */ }
  return { title: `Modalités | ${name}` }
}

export default async function ModalitesPage() {
  const rules = await getPublicSiteRules()

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-[800px] px-4 py-12 sm:px-6 sm:py-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-violet-electric">Boutique</p>
        <h1 className="mt-2 font-display text-4xl tracking-wide text-ivory sm:text-5xl">Modalités et règles</h1>
        <p className="mt-4 max-w-xl font-mono text-xs leading-relaxed text-ivory/50">
          Ces règles s&apos;appliquent à l&apos;usage du site. Elles sont aussi relues, partie par partie, au moment de créer un compte.
        </p>

        {rules.length === 0 ? (
          <p className="mt-10 font-mono text-sm text-ivory/40">Aucune modalité publiée pour le moment.</p>
        ) : (
          <div className="mt-10 space-y-4">
            {rules.map((rule, index) => (
              <article key={rule.id} className="border border-white/10 bg-surface/40 p-5">
                <h2 className="font-display text-xl tracking-wide text-ivory">
                  {index + 1}. {rule.title}
                </h2>
                <p className="mt-3 whitespace-pre-wrap font-mono text-xs leading-relaxed text-ivory/70">
                  {rule.body}
                </p>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
