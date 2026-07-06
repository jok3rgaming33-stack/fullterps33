"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { signup, login } from "@/app/actions/account"
import Link from "next/link"

export default function LoginPage() {
  const [mode, setMode] = useState<"connexion" | "inscription">("connexion")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
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

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <>
      <Navbar />
      <main
        className="grain relative flex min-h-[85vh] items-center justify-center overflow-hidden px-4 py-16"
        onMouseMove={handleMouseMove}
      >
        {/* Lightning effect SVG background */}
        <svg
          className="absolute inset-0 w-full h-full opacity-5 pointer-events-none"
          viewBox="0 0 1200 800"
          preserveAspectRatio="none"
        >
          <path
            d="M 0 0 Q 300 200 600 400 T 1200 800"
            stroke="url(#lightning)"
            strokeWidth="2"
            fill="none"
            className="animate-pulse"
          />
          <defs>
            <linearGradient id="lightning" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#A78BFA" />
            </linearGradient>
          </defs>
        </svg>

        {/* Radial gradient glow following mouse */}
        <div
          className="absolute w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none transition-all duration-300"
          style={{
            background: "radial-gradient(circle, #8B5CF6, transparent)",
            left: `${mousePos.x - 160}px`,
            top: `${mousePos.y - 160}px`,
          }}
        />

        {/* Main container */}
        <div className="relative z-10 w-full max-w-md">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mb-4 flex justify-center">
              <svg
                className="w-14 h-14"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M32 4L44 24H32L48 60L28 36H40L32 4Z"
                  fill="url(#boltGrad)"
                  stroke="#A78BFA"
                  strokeWidth="1.5"
                />
                <defs>
                  <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#C084FC" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="font-display text-3xl md:text-4xl tracking-wider mb-2">FULLTERPS33</h1>
            <div className="h-0.5 w-20 bg-gradient-to-r from-violet-electric via-violet-soft to-transparent mx-auto mb-3" />
            <p className="font-mono text-xs text-ivory/50 uppercase tracking-widest">
              {mode === "connexion" ? "Rejoins la communauté" : "Crée ton compte"}
            </p>
          </div>

          {/* Card */}
          <div className="clip-card relative border border-white/10 bg-surface/40 backdrop-blur-sm p-8">
            {/* Tab navigation */}
            <div className="mb-6 flex gap-4 border-b border-white/10 pb-4">
              <button
                type="button"
                onClick={() => {
                  setMode("connexion")
                  setError(null)
                }}
                className={`relative pb-2 font-mono text-sm uppercase tracking-widest transition-colors ${
                  mode === "connexion"
                    ? "text-violet-electric"
                    : "text-ivory/40 hover:text-ivory/60"
                }`}
              >
                Connexion
                {mode === "connexion" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-electric to-violet-soft" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("inscription")
                  setError(null)
                }}
                className={`relative pb-2 font-mono text-sm uppercase tracking-widest transition-colors ${
                  mode === "inscription"
                    ? "text-violet-electric"
                    : "text-ivory/40 hover:text-ivory/60"
                }`}
              >
                Inscription
                {mode === "inscription" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-electric to-violet-soft" />
                )}
              </button>
            </div>

            {/* Form */}
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              {mode === "inscription" && (
                <label className="flex flex-col gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">
                    Pseudo
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border border-white/15 bg-void px-4 py-2.5 text-sm text-ivory placeholder-ivory/30 outline-none transition focus:border-violet-electric"
                    placeholder="Ton pseudonyme"
                  />
                </label>
              )}

              <label className="flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">
                  Email
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border border-white/15 bg-void px-4 py-2.5 text-sm text-ivory placeholder-ivory/30 outline-none transition focus:border-violet-electric"
                  placeholder="toi@exemple.com"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">
                  Mot de passe
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border border-white/15 bg-void px-4 py-2.5 text-sm text-ivory placeholder-ivory/30 outline-none transition focus:border-violet-electric"
                  placeholder="••••••••"
                />
              </label>

              {error && (
                <div className="border border-signal/30 bg-signal/10 rounded px-3 py-2">
                  <p className="font-mono text-[11px] text-signal">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={pending}
                className="clip-tag mt-2 bg-gradient-to-r from-violet-electric to-violet-soft py-3 font-mono text-xs font-bold uppercase tracking-[0.15em] text-void transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pending ? "Veuillez patienter…" : mode === "connexion" ? "Se connecter" : "Créer mon compte"}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="font-mono text-xs text-ivory/40">OU</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Additional info */}
            {mode === "connexion" && (
              <p className="text-center font-mono text-xs text-ivory/40">
                Pas encore de compte?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("inscription")
                    setError(null)
                  }}
                  className="text-violet-soft hover:text-violet-electric transition"
                >
                  Créer un compte
                </button>
              </p>
            )}

            {mode === "inscription" && (
              <p className="text-center font-mono text-xs text-ivory/40">
                Déjà membre?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("connexion")
                    setError(null)
                  }}
                  className="text-violet-soft hover:text-violet-electric transition"
                >
                  Se connecter
                </button>
              </p>
            )}
          </div>

          {/* Footer links */}
          <div className="mt-8 flex gap-4 justify-center">
            <Link
              href="/"
              className="font-mono text-xs text-ivory/40 hover:text-ivory/60 transition"
            >
              ← Accueil
            </Link>
            <span className="font-mono text-xs text-ivory/20">•</span>
            <Link
              href="/admin"
              className="font-mono text-xs text-ivory/40 hover:text-violet-soft transition"
            >
              Admin
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
