'use client'

import { useState, useTransition } from 'react'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { registerUser } from '@/app/actions/auth'

export default function SignupPage() {
  const [step, setStep] = useState<'initial' | 'loading' | 'success'>('initial')
  const [userToken, setUserToken] = useState<{ pseudo: string; token: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending] = useTransition()

  const handleRegister = async () => {
    setError(null)
    setStep('loading')
    try {
      const result = await registerUser()
      if (result.ok && result.token && result.pseudo) {
        setUserToken({ pseudo: result.pseudo, token: result.token })
        setStep('success')
      } else {
        setError(result.message)
        setStep('initial')
      }
    } catch (err) {
      setError('Erreur lors de l\'enregistrement')
      setStep('initial')
      console.error('[v0] Registration error:', err)
    }
  }

  return (
    <>
      <Navbar />
      <main className="grain relative flex min-h-[85vh] items-center justify-center overflow-hidden px-4 py-16">
        {/* Background effects */}
        <svg className="absolute inset-0 w-full h-full opacity-5 pointer-events-none" viewBox="0 0 1200 800" preserveAspectRatio="none">
          <path d="M 0 0 Q 300 200 600 400 T 1200 800" stroke="url(#lightning)" strokeWidth="2" fill="none" />
          <defs>
            <linearGradient id="lightning" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#A78BFA" />
            </linearGradient>
          </defs>
        </svg>

        <div className="relative z-10 w-full max-w-md">
          {/* Header */}
          <div className="mb-10 text-center">
            <h1 className="font-display text-4xl tracking-wider mb-2">FULLTERPS33</h1>
            <div className="h-0.5 w-20 bg-gradient-to-r from-violet-electric to-violet-soft mx-auto mb-3" />
            <p className="font-mono text-sm text-ivory/50 uppercase tracking-widest">
              {step === 'success' ? 'Bienvenue!' : 'Rejoins la communauté'}
            </p>
          </div>

          {/* Content */}
          {step === 'initial' && (
            <div className="clip-card relative border border-white/10 bg-surface/40 backdrop-blur-sm p-8">
              <div className="mb-6">
                <h2 className="font-display text-2xl mb-4">Un clic pour commencer</h2>
                <ul className="space-y-3 font-mono text-sm text-ivory/70 mb-6">
                  <li className="flex gap-2"><span className="text-violet-electric">✓</span> Pseudo généré automatiquement</li>
                  <li className="flex gap-2"><span className="text-violet-electric">✓</span> TOKEN unique et sécurisé</li>
                  <li className="flex gap-2"><span className="text-violet-electric">✓</span> 1 compte par IP par mois</li>
                  <li className="flex gap-2"><span className="text-violet-electric">✓</span> Points de loyauté offerts</li>
                </ul>
              </div>

              {error && (
                <div className="border border-signal/30 bg-signal/10 rounded px-3 py-2 mb-4">
                  <p className="font-mono text-sm text-signal">{error}</p>
                </div>
              )}

              <button
                onClick={handleRegister}
                disabled={pending}
                className="clip-tag w-full bg-gradient-to-r from-violet-electric to-violet-soft py-3 font-mono text-sm font-bold uppercase tracking-[0.15em] text-void transition hover:brightness-110 disabled:opacity-60"
              >
                {pending ? 'Création...' : 'Créer mon compte'}
              </button>
            </div>
          )}

          {step === 'loading' && (
            <div className="clip-card relative border border-white/10 bg-surface/40 backdrop-blur-sm p-8 text-center">
              <div className="animate-pulse">
                <p className="font-mono text-sm text-ivory/60 mb-4">Génération de votre compte...</p>
                <div className="h-8 w-32 bg-violet-electric/20 rounded mx-auto" />
              </div>
            </div>
          )}

          {step === 'success' && userToken && (
            <div className="clip-card relative border border-white/10 bg-surface/40 backdrop-blur-sm p-8">
              <div className="mb-6">
                <p className="font-mono text-xs text-ivory/50 uppercase tracking-widest mb-2">Ton pseudo</p>
                <p className="font-display text-3xl tracking-wider text-violet-electric mb-6">{userToken.pseudo}</p>

                <p className="font-mono text-xs text-ivory/50 uppercase tracking-widest mb-2">Ton TOKEN</p>
                <div className="bg-void border border-white/15 rounded p-3 mb-4 break-all">
                  <p className="font-mono text-xs text-ivory/60">{userToken.token.substring(0, 50)}...</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(userToken.token)}
                  className="w-full bg-violet-soft/20 hover:bg-violet-soft/30 border border-violet-electric/30 px-4 py-2 font-mono text-xs uppercase tracking-wider text-violet-electric transition"
                >
                  Copier le TOKEN
                </button>
              </div>

              <p className="font-mono text-xs text-ivory/40 text-center">
                Conserve ton TOKEN en sécurité. C'est ta clé d'accès!
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
