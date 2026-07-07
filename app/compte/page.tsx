import { redirect } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { LogoutButton } from "@/components/logout-button"
import { getCurrentCustomer } from "@/app/actions/account"
import { listMyOrders } from "@/app/actions/orders"
import { tierForPoints } from "@/lib/loyalty"
import { formatPrice } from "@/lib/utils"

export default async function AccountPage() {
  const customer = await getCurrentCustomer()
  if (!customer) redirect("/signup")

  const orders = await listMyOrders()
  const tier = tierForPoints(customer.loyaltyPoints)
  const progress = Math.min(100, Math.round((customer.loyaltyPoints / tier.nextAt) * 100))

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[900px] px-4 py-16">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-4xl tracking-wide text-ivory">Mon Compte</h1>
            <p className="mt-2 font-mono text-xs uppercase tracking-widest text-ivory/40">
              {customer.pseudo}
            </p>
          </div>
          <LogoutButton />
        </div>

        {/* Loyalty */}
        <section className="clip-card mt-10 border border-white/10 bg-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-violet-electric">
                Programme fidélité
              </span>
              <h2 className="mt-1 font-display text-2xl tracking-wide">Palier {tier.name}</h2>
            </div>
            <span className="font-mono text-2xl font-bold text-violet-electric">
              {customer.loyaltyPoints} pts
            </span>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden bg-void">
            <div
              className="h-full bg-gradient-to-r from-violet-deep to-violet-electric"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 font-mono text-[11px] text-ivory/40">
            {Math.max(0, tier.nextAt - customer.loyaltyPoints)} points avant le prochain palier ·
            1 point gagné par euro dépensé
          </p>
        </section>

        {/* Orders */}
        <section className="mt-10">
          <h2 className="mb-4 font-display text-2xl tracking-wide">Mes commandes</h2>
          {orders.length === 0 ? (
            <p className="font-mono text-sm text-ivory/40">Aucune commande pour l'instant.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {orders.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between border border-white/10 bg-surface px-5 py-4"
                >
                  <div>
                    <p className="font-mono text-sm text-ivory">Commande #{o.id}</p>
                    <p className="font-mono text-[11px] text-ivory/40">
                      {new Date(o.createdAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-mono text-sm font-bold">{formatPrice(o.total)}</span>
                    <span className="clip-tag bg-violet-deep px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-ivory">
                      {o.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
