"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { adminLogin } from "@/app/actions/admin-auth"

export function AdminLoginForm() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await adminLogin(password)
      if (result.ok) {
        router.refresh()
      } else {
        setError(result.message)
      }
    })
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="clip-card w-full max-w-sm border border-white/10 bg-surface p-8"
      >
        <h1 className="font-display text-2xl tracking-wide text-ivory">Panel Admin</h1>
        <p className="mt-1 font-mono text-xs text-ivory/40">Accès restreint</p>

        <label className="mt-6 flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">
            Mot de passe
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-white/15 bg-void px-3 py-2.5 text-sm text-ivory outline-none focus:border-violet-electric"
            placeholder="••••••••"
            autoFocus
          />
        </label>

        {error && <p className="mt-3 font-mono text-[11px] text-signal">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="clip-tag mt-6 w-full bg-violet-electric py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-void transition hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "…" : "Entrer"}
        </button>
      </form>
    </div>
  )
}
