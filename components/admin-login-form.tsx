"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Zap, Lock } from "lucide-react"
import { loginAdmin } from "@/app/actions/admin"

export function AdminLoginForm() {
  const [token, setToken] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await loginAdmin(token)
      if (result.ok) {
        router.refresh()
      } else {
        setError(result.error ?? "Token invalide.")
      }
    })
  }

  return (
    <div className="grain relative flex min-h-screen items-center justify-center overflow-hidden bg-void px-4">
      {/* Background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(40% 40% at 50% 0%, rgba(179,85,255,0.12), transparent 70%)",
        }}
      />

      {/* Lightning decorations */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.04] pointer-events-none"
        viewBox="0 0 800 600"
        preserveAspectRatio="none"
      >
        <path d="M 0 0 L 200 300 L 160 300 L 400 600" stroke="#B355FF" strokeWidth="2" fill="none" />
        <path d="M 800 0 L 600 250 L 640 250 L 400 600" stroke="#B355FF" strokeWidth="2" fill="none" />
      </svg>

      <div className="relative z-10 w-full max-w-sm animate-rise-fade">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-violet-electric/10 ring-1 ring-violet-electric/30">
            <Zap className="h-7 w-7 text-violet-electric animate-flicker" />
          </div>
          <div>
            <h1 className="font-display text-3xl tracking-widest text-ivory">FULLTERPS33</h1>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-ivory/40">
              Panel Administration
            </p>
          </div>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-violet-electric to-transparent" />
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="clip-card flex flex-col gap-5 border border-white/10 bg-surface p-8"
        >
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-violet-electric" />
            <span className="font-mono text-xs uppercase tracking-widest text-ivory/60">
              Accès restreint
            </span>
          </div>

          <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">
              Token admin
            </span>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="border border-white/15 bg-void px-4 py-3 text-sm text-ivory placeholder-ivory/20 outline-none transition-colors focus:border-violet-electric"
              placeholder="••••••••••••••••"
              autoFocus
              autoComplete="current-password"
            />
          </label>

          {error && (
            <div className="border border-signal/30 bg-signal/5 px-3 py-2">
              <p className="font-mono text-[11px] text-signal">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={pending || !token}
            className="clip-tag bg-violet-electric py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-void transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Vérification…" : "Entrer"}
          </button>
        </form>

        <p className="mt-6 text-center font-mono text-[10px] text-ivory/20">
          Accès réservé aux administrateurs autorisés
        </p>
      </div>
    </div>
  )
}
