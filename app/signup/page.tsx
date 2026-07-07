'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { UserTokenCard } from '@/components/user-token-card'
import { registerUser } from '@/app/actions/auth'
import Link from 'next/link'

export default function SignupPage() {
  const [step, setStep] = useState<'initial' | 'loading' | 'success'>('initial')
  const [userToken, setUserToken] = useState<{ pseudo: string; token: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const handleRegister = () => {
    setError(null)
    setStep('loading')
    startTransition(async () => {
      const result = await registerUser()
      if (result.ok && result.token && result.pseudo) {
        setUserToken({ pseudo: result.pseudo, token: result.token })
        setStep('success')
      } else {
        setError(result.message)
        setStep('initial')
      }
    })
  }

  return (
    <>
      <Navbar />
      <main className="grain relative flex min-h-[85vh] items-center justify-center overflow-hidden px-4 py-16">
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

        <div className="relative z-10 w-full max-w-md">
          {step === 'initial' && (
            <>
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
                  Rejoins la communauté
                </p>
              </div>

              <div className="clip-card relative border border-white/10 bg-surface/40 backdrop-blur-sm p-8">
                <div className="mb-6">
                  <p className="font-mono text-sm text-ivory/80 mb-4">
                    L'enregistrement sur FULLTERPS33 est simple et gratuit. Un pseudo et un TOKEN unique te seront générés automatiquement.
                  </p>
                  <ul className="space-y-2 font-mono text-xs text-ivory/60 mb-6">
                    <li className="flex items-start gap-2">
                      <span className="text-violet-electric">✓</span>
                      <span>Pseudo généré automatiquement</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-electric">✓</span>
                      <span>TOKEN d'accès unique et sécurisé</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-electric">✓</span>
                      <span>Limite: 1 compte par IP par mois</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-electric">✓</span>
                      <span>Points de loyauté automatiques</span>
                    </li>
                  </ul>
                </div>

                {error && (
                  <div className="border border-signal/30 bg-signal/10 rounded px-3 py-2 mb-4">
                    <p className="font-mono text-xs text-signal">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleRegister}
                  disabled={pending}
                  className="w-full clip-tag bg-gradient-to-r from-violet-electric to-violet-soft py-3 font-mono text-xs font-bold uppercase tracking-widest text-void transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {pending ? 'Génération en cours…' : 'Créer mon compte'}
                </button>

                <div className="mt-6 pt-6 border-t border-white/10 text-center">
                  <p className="font-mono text-xs text-ivory/40 mb-2">Déjà membre?</p>
                  <Link
                    href="/login"
                    className="text-violet-soft hover:text-violet-electric transition font-mono text-xs uppercase tracking-wider"
                  >
                    Se connecter avec mon TOKEN
                  </Link>
                </div>
              </div>
            </>
          )}

          {step === 'loading' && (
            <div className="text-center">
              <div className="inline-block">
                <div className="w-12 h-12 border-2 border-violet-electric border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="font-mono text-sm text-ivory/60 mt-4">Génération de ton TOKEN…</p>
            </div>
          )}

          {step === 'success' && userToken && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="font-display text-2xl tracking-wider text-violet-electric mb-2">
                  Bienvenue dans FULLTERPS33!
                </h2>
                <p className="font-mono text-xs text-ivory/50">Ton compte a été créé avec succès</p>
              </div>

              <UserTokenCard pseudo={userToken.pseudo} token={userToken.token} />

              <div className="text-center">
                <Link
                  href="/"
                  className="inline-block clip-tag bg-void border border-white/20 py-2 px-6 font-mono text-xs font-bold uppercase tracking-widest text-ivory hover:border-violet-electric transition"
                >
                  Retour à l'accueil
                </Link>
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="font-mono text-xs text-ivory/40 hover:text-ivory/60 transition"
            >
              ← Accueil
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
