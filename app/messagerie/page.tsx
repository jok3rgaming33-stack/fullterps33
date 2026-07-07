import { redirect } from "next/navigation"
import { getCustomerToken } from "@/lib/auth"
import { getCurrentCustomer } from "@/app/actions/account"
import { getThreadsForToken } from "@/app/actions/messaging"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MessagerieClient } from "@/components/messagerie-client"

export const dynamic = "force-dynamic"

export default async function MessageriePage() {
  const token = await getCustomerToken()
  if (!token) redirect("/signup")

  const customer = await getCurrentCustomer()
  const userData = customer ? { pseudo: customer.pseudo, token: customer.token } : null

  const threads = customer ? await getThreadsForToken(customer.token) : []

  return (
    <>
      <Navbar userData={userData} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-8 font-display text-3xl tracking-wide text-ivory">
          Messagerie
        </h1>
        <MessagerieClient userData={userData} initialThreads={threads} />
      </main>
      <Footer />
    </>
  )
}
