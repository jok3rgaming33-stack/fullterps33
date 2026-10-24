"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Zap, Lock } from "lucide-react"
import { loginAdmin } from "@/app/actions/admin"
import { loginStaff } from "@/app/actions/staff"

export function AdminLoginForm() {
  const [mode, setMode] = useState<"token" | "compte">("token")
  const [token, setToken] = useState("")
  const [pseudo, setPseudo] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      if (mode === "compte") {
        const result = await loginStaff(pseudo, password)
        if (result.ok) {
          router.push(result.role === "livreur" ? "/livreur" : "/admin")
          router.refresh()
        } else {
          setError(result.error)
        }
        return
      }
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
            <h1 className="font-display text-3xl tracking-widest text-ivory">BRUMÉCO</h1>
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

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("token")}
              className={`border px-2 py-2 font-mono text-[10px] uppercase tracking-widest ${mode === "token" ? "border-violet-electric text-violet-electric" : "border-white/15 text-ivory/40"}`}
            >
              Token
            </button>
            <button
              type="button"
              onClick={() => setMode("compte")}
              className={`border px-2 py-2 font-mono text-[10px] uppercase tracking-widest ${mode === "compte" ? "border-violet-electric text-violet-electric" : "border-white/15 text-ivory/40"}`}
            >
              Compte staff
            </button>
          </div>

          {mode === "token" ? (
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
          ) : (
            <>
              <label className="flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">Pseudo</span>
                <input
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  className="border border-white/15 bg-void px-4 py-3 text-sm text-ivory outline-none focus:border-violet-electric"
                  autoComplete="username"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">Mot de passe</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border border-white/15 bg-void px-4 py-3 text-sm text-ivory outline-none focus:border-violet-electric"
                  autoComplete="current-password"
                />
              </label>
            </>
          )}

          {error && (
            <div className="border border-signal/30 bg-signal/5 px-3 py-2">
              <p className="font-mono text-[11px] text-signal">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={pending || (mode === "token" ? !token : !pseudo.trim() || !password)}
            className="clip-tag bg-violet-electric py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-void transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Vérification…" : "Entrer"}
          </button>
        </form>

        <p className="mt-6 text-center font-mono text-[10px] text-ivory/20">
          Accès réservé à l&apos;admin et au staff
        </p>
      </div>
    </div>
  )
}
