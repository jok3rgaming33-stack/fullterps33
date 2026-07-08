import { redirect } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { LogoutButton } from "@/components/logout-button"
import { getCurrentCustomer } from "@/app/actions/account"
import { getThreadsForToken } from "@/app/actions/messaging"
import { tierForPoints } from "@/lib/loyalty"
import { getLoyaltyTiers } from "@/app/actions/loyalty"
import { formatPrice } from "@/lib/utils"
import { LoyaltyModal } from "@/components/loyalty-modal"
import { PushSubscribeButton } from "@/components/push-subscribe-button"
import { MessagerieClient } from "@/components/messagerie-client"

export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const customer = await getCurrentCustomer()
  if (!customer) redirect("/signup")

  const [threads, tier, loyaltyTiers] = await Promise.all([
    getThreadsForToken(customer.token),
    Promise.resolve(tierForPoints(customer.loyaltyPoints)),
    getLoyaltyTiers(),
  ])
  const progress = Math.min(100, Math.round((customer.loyaltyPoints / tier.nextAt) * 100))
  const userData = { pseudo: customer.pseudo, token: customer.token }

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

        {/* Fidélité */}
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
          <div className="mt-3 flex items-center justify-between">
            <p className="font-mono text-[11px] text-ivory/40">
              {Math.max(0, tier.nextAt - customer.loyaltyPoints)} pts avant le prochain palier
            </p>
            <LoyaltyModal currentPoints={customer.loyaltyPoints} tiers={loyaltyTiers} />
          </div>
        </section>

        {/* Notifications */}
        <div className="mt-4 flex justify-end">
          <PushSubscribeButton />
        </div>

        {/* Commandes & messagerie */}
        <section className="mt-10">
          <h2 className="mb-4 font-display text-2xl tracking-wide">Mes commandes & messages</h2>
          <MessagerieClient userData={userData} initialThreads={threads} />
        </section>
      </main>
      <Footer />
    </>
  )
}
