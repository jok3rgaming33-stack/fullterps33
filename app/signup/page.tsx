'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { registerUser, loginWithToken } from '@/app/actions/auth'
import { loginAdmin } from '@/app/actions/admin'

type Tab = 'create' | 'login'

export default function SignupPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('create')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ pseudo: string; token: string } | null>(null)
  const [tokenInput, setTokenInput] = useState('')

  const handleCreate = async () => {
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
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement")
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!tokenInput.trim()) {
      setError('Saisis ton TOKEN')
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Essai comme token membre
      const res = await loginWithToken(tokenInput.trim())
      if (res.ok) {
        router.push('/compte')
        return
      }
      // Essai comme token admin
      const adminRes = await loginAdmin(tokenInput.trim())
      if (adminRes.ok) {
        router.push('/admin')
        return
      }
      setError('Token invalide ou expiré')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="grain relative min-h-[85vh] flex items-center justify-center px-4 py-16">
        {/* Éclairs décoratifs */}
        <svg className="pointer-events-none absolute left-8 top-20 opacity-10" width="40" height="60" viewBox="0 0 46 64" fill="none">
          <path d="M28 0L4 34H20L14 64L42 26H24L28 0Z" fill="#B355FF" />
        </svg>
        <svg className="pointer-events-none absolute right-12 bottom-24 opacity-10 rotate-12" width="28" height="44" viewBox="0 0 46 64" fill="none">
          <path d="M28 0L4 34H20L14 64L42 26H24L28 0Z" fill="#B355FF" />
        </svg>

        <div className="relative z-10 w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-violet-electric/40 bg-surface mb-4">
              <svg width="22" height="30" viewBox="0 0 46 64" fill="none">
                <path d="M28 0L4 34H20L14 64L42 26H24L28 0Z" fill="#B355FF" />
              </svg>
            </div>
            <h1 className="font-display text-4xl tracking-wider mb-2">FULLTERPS33</h1>
            <div className="h-px w-16 bg-violet-electric/60 mx-auto mb-3" />
            <p className="font-mono text-xs text-ivory/40 uppercase tracking-widest">
              Accès membres
            </p>
          </div>

          {!result ? (
            <div className="clip-card border border-white/10 bg-surface/40 backdrop-blur-sm overflow-hidden">
              {/* Onglets */}
              <div className="flex border-b border-white/10">
                <button
                  onClick={() => { setTab('create'); setError(null) }}
                  className={`flex-1 py-3 font-mono text-xs uppercase tracking-[0.15em] transition ${
                    tab === 'create'
                      ? 'text-violet-electric border-b-2 border-violet-electric bg-violet-electric/5'
                      : 'text-ivory/40 hover:text-ivory/70'
                  }`}
                >
                  Nouveau compte
                </button>
                <button
                  onClick={() => { setTab('login'); setError(null) }}
                  className={`flex-1 py-3 font-mono text-xs uppercase tracking-[0.15em] transition ${
                    tab === 'login'
                      ? 'text-violet-electric border-b-2 border-violet-electric bg-violet-electric/5'
                      : 'text-ivory/40 hover:text-ivory/70'
                  }`}
                >
                  J&apos;ai un token
                </button>
              </div>

              <div className="p-8 space-y-6">
                {/* Onglet Création */}
                {tab === 'create' && (
                  <>
                    <div className="space-y-3">
                      <p className="font-mono text-sm text-ivory/60">Un clic suffit — pseudo et token générés automatiquement.</p>
                      <ul className="space-y-2 font-mono text-xs text-ivory/50 pt-1">
                        {[
                          'Pseudo unique généré automatiquement',
                          'TOKEN sécurisé (64 caractères)',
                          '1 compte par IP par mois',
                          'Points de fidélité offerts dès le premier ordre',
                        ].map((item) => (
                          <li key={item} className="flex gap-2 items-start">
                            <span className="text-violet-electric mt-0.5">▸</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {error && (
                      <div className="border border-signal/30 bg-signal/10 rounded px-3 py-2">
                        <p className="font-mono text-xs text-signal">{error}</p>
                      </div>
                    )}

                    <button
                      onClick={handleCreate}
                      disabled={loading}
                      className="clip-tag w-full bg-violet-electric py-3 font-mono text-sm font-bold uppercase tracking-[0.15em] text-void transition hover:brightness-110 disabled:opacity-50"
                    >
                      {loading ? 'Création en cours...' : 'Créer mon compte'}
                    </button>
                  </>
                )}

                {/* Onglet Connexion */}
                {tab === 'login' && (
                  <>
                    <div className="space-y-2">
                      <label className="label-admin block">Ton TOKEN</label>
                      <textarea
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder="Colle ton token ici..."
                        rows={3}
                        className="input-admin resize-none font-mono text-xs"
                      />
                      <p className="font-mono text-[10px] text-ivory/30">
                        Tu as reçu ce token lors de la création de ton compte.
                      </p>
                    </div>

                    {error && (
                      <div className="border border-signal/30 bg-signal/10 rounded px-3 py-2">
                        <p className="font-mono text-xs text-signal">{error}</p>
                      </div>
                    )}

                    <button
                      onClick={handleLogin}
                      disabled={loading || !tokenInput.trim()}
                      className="clip-tag w-full bg-violet-electric py-3 font-mono text-sm font-bold uppercase tracking-[0.15em] text-void transition hover:brightness-110 disabled:opacity-50"
                    >
                      {loading ? 'Connexion...' : 'Se connecter'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Résultat création */
            <div className="clip-card border border-white/10 bg-surface/40 backdrop-blur-sm p-8 space-y-5">
              <div className="text-center mb-2">
                <p className="font-mono text-xs text-violet-electric uppercase tracking-widest">Compte créé</p>
                <h2 className="font-display text-3xl tracking-wider mt-1">{result.pseudo}</h2>
              </div>

              <div className="border border-violet-electric/20 bg-void/60 rounded-lg p-4 space-y-2">
                <p className="label-admin">Ton TOKEN — conserve-le précieusement</p>
                <p className="font-mono text-xs text-violet-electric break-all select-all bg-black/40 p-3 rounded leading-relaxed">
                  {result.token}
                </p>
                <p className="font-mono text-[10px] text-ivory/30">
                  C&apos;est ta seule clé d&apos;accès. Sans lui, tu ne peux pas te reconnecter.
                </p>
              </div>

              <a
                href="/compte"
                className="clip-tag block w-full text-center bg-violet-electric py-3 font-mono text-sm font-bold uppercase tracking-[0.15em] text-void transition hover:brightness-110"
              >
                Accéder à mon compte
              </a>

              <a
                href="/"
                className="block w-full text-center font-mono text-xs text-ivory/40 hover:text-ivory/70 transition py-2"
              >
                ← Retour à la boutique
              </a>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
