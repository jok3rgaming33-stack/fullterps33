"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { logout } from "@/app/actions/account"

export function LogoutButton() {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await logout()
          router.push("/")
          router.refresh()
        })
      }
      className="border border-white/20 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-ivory/70 transition hover:border-signal hover:text-signal disabled:opacity-60"
    >
      {pending ? "…" : "Se déconnecter"}
    </button>
  )
}
