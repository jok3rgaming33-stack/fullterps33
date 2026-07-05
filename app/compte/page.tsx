import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { formatPrice } from "@/lib/utils"

const orders = [
  { id: "FT33-CMD-1042", date: "28 juin 2026", total: 118, status: "Livrée" },
  { id: "FT33-CMD-1039", date: "12 juin 2026", total: 79, status: "En transit" },
]

const loyaltyPoints = 340
const loyaltyTier = "Orage"
const nextTierAt = 500

export default function AccountPage() {
  const progress = Math.min(100, Math.round((loyaltyPoints / nextTierAt) * 100))

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[900px] px-4 py-16">
        <h1 className="font-display text-4xl tracking-wide text-ivory">Mon Compte</h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-widest text-ivory/40">
          Espace démo — données fictives
        </p>

        {/* Loyalty */}
        <section className="clip-card mt-10 border border-white/10 bg-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-violet-electric">
                Programme fidélité
              </span>
              <h2 className="mt-1 font-display text-2xl tracking-wide">Palier {loyaltyTier}</h2>
            </div>
            <span className="font-mono text-2xl font-bold text-violet-electric">{loyaltyPoints} pts</span>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden bg-void">
            <div
              className="h-full bg-gradient-to-r from-violet-deep to-violet-electric"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 font-mono text-[11px] text-ivory/40">
            {nextTierAt - loyaltyPoints} points avant le prochain palier
          </p>
        </section>

        {/* Orders */}
        <section className="mt-10">
          <h2 className="mb-4 font-display text-2xl tracking-wide">Mes commandes</h2>
          <ul className="flex flex-col gap-3">
            {orders.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between border border-white/10 bg-surface px-5 py-4"
              >
                <div>
                  <p className="font-mono text-sm text-ivory">{o.id}</p>
                  <p className="font-mono text-[11px] text-ivory/40">{o.date}</p>
                </div>
                <div className="flex items-center gap-6">
                  <span className="font-mono text-sm font-bold">{formatPrice(o.total)}</span>
                  <span
                    className={`clip-tag px-3 py-1 font-mono text-[10px] uppercase tracking-wide ${
                      o.status === "Livrée"
                        ? "bg-violet-electric text-void"
                        : "bg-violet-deep text-ivory"
                    }`}
                  >
                    {o.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </>
  )
}
