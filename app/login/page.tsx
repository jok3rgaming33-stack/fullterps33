"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { signup, login } from "@/app/actions/account"

export default function LoginPage() {
  const [mode, setMode] = useState<"connexion" | "inscription">("connexion")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result =
        mode === "connexion" ? await login(email, password) : await signup(name, email, password)
      if (result.ok) {
        router.push("/compte")
        router.refresh()
      } else {
        setError(result.message)
      }
    })
  }

  return (
    <>
      <Navbar />
      <main className="grain relative flex min-h-[70vh] items-center justify-center overflow-hidden px-4 py-16">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(50% 40% at 50% 0%, rgba(179,85,255,0.15), transparent 60%), #07060B",
          }}
        />
        <div className="clip-card relative w-full max-w-md border border-white/10 bg-surface p-8">
          <div className="mb-6 flex gap-6 border-b border-white/10 pb-4">
            <button
              type="button"
              onClick={() => {
                setMode("connexion")
                setError(null)
              }}
              className={`font-display text-xl tracking-wide ${mode === "connexion" ? "text-violet-electric" : "text-ivory/40"}`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("inscription")
                setError(null)
              }}
              className={`font-display text-xl tracking-wide ${mode === "inscription" ? "text-violet-electric" : "text-ivory/40"}`}
            >
              Inscription
            </button>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {mode === "inscription" && (
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">Pseudo</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border border-white/15 bg-void px-3 py-2.5 text-sm text-ivory outline-none focus:border-violet-electric"
                  placeholder="Ton pseudo"
                />
              </label>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border border-white/15 bg-void px-3 py-2.5 text-sm text-ivory outline-none focus:border-violet-electric"
                placeholder="toi@exemple.com"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">Mot de passe</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-white/15 bg-void px-3 py-2.5 text-sm text-ivory outline-none focus:border-violet-electric"
                placeholder="••••••••"
              />
            </label>

            {error && <p className="font-mono text-[11px] text-signal">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="clip-tag mt-2 bg-violet-electric py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-void transition hover:brightness-110 disabled:opacity-60"
            >
              {pending ? "…" : mode === "connexion" ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  )
}
