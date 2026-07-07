'use client'

import { useState } from 'react'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { registerUser } from '@/app/actions/auth'

export default function SignupPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ pseudo: string; token: string } | null>(null)

  const handleRegister = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await registerUser()
      if (res.ok && res.token && res.pseudo) {
        setResult({ pseudo: res.pseudo, token: res.token })
      } else {
        setError(res.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="grain relative min-h-[85vh] flex items-center justify-center px-4 py-16">
        <div className="relative z-10 w-full max-w-md">
          <div className="mb-10 text-center">
            <h1 className="font-display text-4xl tracking-wider mb-2">FULLTERPS33</h1>
            <div className="h-0.5 w-20 bg-gradient-to-r from-violet-electric to-violet-soft mx-auto mb-3" />
            <p className="font-mono text-sm text-ivory/50 uppercase tracking-widest">
              {result ? 'Bienvenue!' : 'Rejoins la communauté'}
            </p>
          </div>

          <div className="clip-card relative border border-white/10 bg-surface/40 backdrop-blur-sm p-8">
            {!result ? (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-2xl mb-4">Un clic pour commencer</h2>
                  <ul className="space-y-3 font-mono text-sm text-ivory/70">
                    <li className="flex gap-2">
                      <span className="text-violet-electric">✓</span>
                      <span>Pseudo généré automatiquement</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-violet-electric">✓</span>
                      <span>TOKEN unique et sécurisé</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-violet-electric">✓</span>
                      <span>1 compte par IP par mois</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-violet-electric">✓</span>
                      <span>Points de loyauté offerts</span>
                    </li>
                  </ul>
                </div>

                {error && (
                  <div className="border border-signal/30 bg-signal/10 rounded px-3 py-2">
                    <p className="font-mono text-xs text-signal">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className="clip-tag w-full bg-gradient-to-r from-violet-electric to-violet-soft py-3 font-mono text-sm font-bold uppercase tracking-[0.15em] text-void transition hover:brightness-110 disabled:opacity-60"
                >
                  {loading ? 'Création en cours...' : 'Créer mon compte'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="border border-violet-electric/30 bg-violet-electric/10 rounded-lg p-6">
                  <p className="font-mono text-xs text-ivory/50 uppercase tracking-wider mb-2">Ton pseudo</p>
                  <p className="font-display text-3xl tracking-wider text-violet-electric">
                    {result.pseudo}
                  </p>
                </div>

                <div className="border border-violet-electric/30 bg-violet-electric/10 rounded-lg p-6">
                  <p className="font-mono text-xs text-ivory/50 uppercase tracking-wider mb-2">Ton TOKEN</p>
                  <p className="font-mono text-xs text-violet-electric break-all select-all bg-void/50 p-3 rounded">
                    {result.token}
                  </p>
                  <p className="font-mono text-[10px] text-ivory/40 mt-4">
                    Conserve ce TOKEN précieusement. C'est ta clé d'accès!
                  </p>
                </div>

                <button
                  onClick={() => {
                    setResult(null)
                    setError(null)
                  }}
                  className="clip-tag w-full bg-violet-electric py-3 font-mono text-sm font-bold uppercase tracking-[0.15em] text-void transition hover:brightness-110"
                >
                  Créer un autre compte
                </button>

                <a
                  href="/"
                  className="block w-full text-center font-mono text-xs text-ivory/60 hover:text-ivory/80 transition py-3"
                >
                  ← Retour à l'accueil
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
