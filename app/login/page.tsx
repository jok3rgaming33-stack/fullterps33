"use client"

import { useState } from "react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function LoginPage() {
  const [mode, setMode] = useState<"connexion" | "inscription">("connexion")

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
              onClick={() => setMode("connexion")}
              className={`font-display text-xl tracking-wide ${mode === "connexion" ? "text-violet-electric" : "text-ivory/40"}`}
            >
              Connexion
            </button>
            <button
              onClick={() => setMode("inscription")}
              className={`font-display text-xl tracking-wide ${mode === "inscription" ? "text-violet-electric" : "text-ivory/40"}`}
            >
              Inscription
            </button>
          </div>

          <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
            {mode === "inscription" && (
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">Pseudo</span>
                <input
                  type="text"
                  className="border border-white/15 bg-void px-3 py-2.5 text-sm text-ivory outline-none focus:border-violet-electric"
                  placeholder="Ton pseudo"
                />
              </label>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">Email</span>
              <input
                type="email"
                className="border border-white/15 bg-void px-3 py-2.5 text-sm text-ivory outline-none focus:border-violet-electric"
                placeholder="toi@exemple.com"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">Mot de passe</span>
              <input
                type="password"
                className="border border-white/15 bg-void px-3 py-2.5 text-sm text-ivory outline-none focus:border-violet-electric"
                placeholder="••••••••"
              />
            </label>

            <button
              type="submit"
              className="clip-tag mt-2 bg-violet-electric py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-void transition hover:brightness-110"
            >
              {mode === "connexion" ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>

          <p className="mt-6 text-center font-mono text-[11px] text-ivory/40">
            Démo front-end — aucune authentification réelle n'est branchée.{" "}
            <Link href="/compte" className="text-violet-electric hover:underline">
              Voir l'espace compte →
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
