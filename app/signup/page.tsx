'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerUser, loginWithToken } from '@/app/actions/auth'
import { loginAdmin } from '@/app/actions/admin'
import {
  finishCustomerWebAuthnAuthentication,
  startCustomerWebAuthnAuthentication,
} from '@/app/actions/webauthn'
import { browserSupportsWebAuthnSync, loadWebAuthnBrowser } from '@/lib/webauthn-browser'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'
import { HowItWorksModal } from '@/components/how-it-works-modal'
import { SiteRulesModal } from '@/components/site-rules-modal'
import { useSiteRules } from '@/components/site-rules-context'
import { useSignupBrand } from '@/components/signup-brand'
import { AGE_NOTE } from '@/lib/brand'
import { siteRulesVersion } from '@/lib/site-rules'

const RULES_STORAGE_KEY = 'ft33_rules_ok'

type Tab = 'create' | 'login'

export default function SignupPage() {
  const router = useRouter()
  const siteName = useSignupBrand()
  const rules = useSiteRules()
  const rulesVersion = siteRulesVersion(rules)
  const mustRead = rules.length > 0
  const [tab, setTab] = useState<Tab>('create')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ pseudo: string; token: string } | null>(null)
  const [tokenInput, setTokenInput] = useState('')
  const [rulesOpen, setRulesOpen] = useState(false)
  const [rulesAccepted, setRulesAccepted] = useState(false)
  const [bioOk, setBioOk] = useState(false)

  useEffect(() => {
    setBioOk(browserSupportsWebAuthnSync())
  }, [])

  useEffect(() => {
    setRulesAccepted(window.localStorage.getItem(RULES_STORAGE_KEY) === rulesVersion)
  }, [rulesVersion])

  const acceptRules = () => {
    window.localStorage.setItem(RULES_STORAGE_KEY, rulesVersion)
    setRulesAccepted(true)
    setRulesOpen(false)
  }

  const handleCreate = async () => {
    if (mustRead && !rulesAccepted) {
      setError('Lis et accepte les modalités du site avant de créer un compte.')
      setRulesOpen(true)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await registerUser(mustRead ? rulesVersion : undefined)
      if (res.ok && res.token && res.pseudo) {
        setResult({ pseudo: res.pseudo, token: res.token })
      } else {
        if (res.message.includes('modalités')) {
          setRulesAccepted(false)
          setRulesOpen(true)
          router.refresh()
        }
        setError(res.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement")
    } finally {
      setLoading(false)
    }
  }

  const handleBioLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const api = await loadWebAuthnBrowser()
      if (!api?.browserSupportsWebAuthn()) {
        setError("Cet appareil ne propose pas la biométrie.")
        return
      }
      const started = await startCustomerWebAuthnAuthentication()
      if (!started.ok) {
        setError(started.error)
        return
      }
      const response = (await api.startAuthentication({ optionsJSON: started.options })) as unknown as AuthenticationResponseJSON
      const done = await finishCustomerWebAuthnAuthentication({
        challengeId: started.challengeId,
        response,
      })
      if (!done.ok) {
        setError(done.error)
        return
      }
      router.push('/compte')
    } catch {
      setError("Connexion biométrique annulée. Tu peux utiliser ton token.")
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
      <main className="mx-auto grid min-h-screen w-full max-w-[1200px] grid-cols-1 items-center px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-12">
        <div className="mx-auto w-full max-w-md lg:mx-0">
          {/* En-tête */}
          <div className="mb-8 text-center lg:text-left">
            {/* Visuel personnage en mobile/tablette (en desktop il occupe la colonne de droite) */}
            <div className="relative mx-auto mb-2 w-40 sm:w-48 lg:hidden">
              <div className="storm-halo absolute inset-[12%] rounded-full" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/hero-character.svg"
                alt=""
                width={660}
                height={660}
                className="storm-character relative h-auto w-full select-none"
                draggable={false}
              />
            </div>
            <div className="mb-4 hidden h-14 w-14 items-center justify-center rounded-full border border-violet-electric/40 bg-surface lg:inline-flex">
              <svg width="22" height="30" viewBox="0 0 46 64" fill="none">
                <path d="M28 0L4 34H20L14 64L42 26H24L28 0Z" fill="#B355FF" />
              </svg>
            </div>
            <h1 className="font-display text-4xl tracking-wider mb-2 sm:text-5xl">{siteName}</h1>
            <div className="mx-auto mb-3 h-px w-16 bg-violet-electric/60 lg:mx-0" />
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
                  className={`flex-1 min-h-[48px] py-3 font-mono text-xs uppercase tracking-[0.15em] transition ${
                    tab === 'create'
                      ? 'text-violet-electric border-b-2 border-violet-electric bg-violet-electric/5'
                      : 'text-ivory/40 hover:text-ivory/70'
                  }`}
                >
                  Nouveau compte
                </button>
                <button
                  onClick={() => { setTab('login'); setError(null) }}
                  className={`flex-1 min-h-[48px] py-3 font-mono text-xs uppercase tracking-[0.15em] transition ${
                    tab === 'login'
                      ? 'text-violet-electric border-b-2 border-violet-electric bg-violet-electric/5'
                      : 'text-ivory/40 hover:text-ivory/70'
                  }`}
                >
                  J&apos;ai un token
                </button>
              </div>

              <div className="p-5 space-y-6 sm:p-8">
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
                          'Points de fidélité offerts dès la première commande',
                          'Vente réservée aux 18 ans et plus',
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

                    {mustRead && !rulesAccepted ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setRulesOpen(true)}
                          className="clip-tag w-full bg-violet-electric py-3.5 font-mono text-sm font-bold uppercase tracking-[0.15em] text-void transition hover:brightness-110"
                        >
                          Lire les modalités avant de continuer
                        </button>
                        <p className="text-center font-mono text-[10px] leading-relaxed text-ivory/40">
                          La création du compte sera déverrouillée après avoir ouvert chaque partie et accepté.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={handleCreate}
                          disabled={loading}
                          className="clip-tag w-full bg-violet-electric py-3.5 font-mono text-sm font-bold uppercase tracking-[0.15em] text-void transition hover:brightness-110 disabled:opacity-50"
                        >
                          {loading ? 'Création en cours...' : 'Créer mon compte'}
                        </button>
                        {mustRead && (
                          <button
                            type="button"
                            onClick={() => setRulesOpen(true)}
                            className="w-full py-1 font-mono text-[10px] uppercase tracking-widest text-ivory/40 hover:text-violet-electric"
                          >
                            Relire les modalités
                          </button>
                        )}
                      </div>
                    )}
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

                    {bioOk && (
                      <button
                        type="button"
                        onClick={handleBioLogin}
                        disabled={loading}
                        className="w-full border border-violet-electric/40 bg-violet-electric/10 py-3 font-mono text-xs font-bold uppercase tracking-[0.15em] text-violet-electric transition hover:bg-violet-electric/20 disabled:opacity-50"
                      >
                        {loading ? 'Connexion...' : 'Connexion biométrique'}
                      </button>
                    )}

                    <button
                      onClick={handleLogin}
                      disabled={loading || !tokenInput.trim()}
                      className="clip-tag w-full bg-violet-electric py-3.5 font-mono text-sm font-bold uppercase tracking-[0.15em] text-void transition hover:brightness-110 disabled:opacity-50"
                    >
                      {loading ? 'Connexion...' : 'Se connecter'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Résultat création */
            <div className="clip-card border border-white/10 bg-surface/40 backdrop-blur-sm p-5 space-y-5 sm:p-8">
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

          {/* Aide + mention légale, sous la carte */}
          <SiteRulesModal
            rules={rules}
            open={rulesOpen}
            requireRead={mustRead && !rulesAccepted}
            onClose={() => setRulesOpen(false)}
            onAccept={acceptRules}
          />

          <div className="mt-6 flex flex-col items-center gap-4 lg:items-start">
            <HowItWorksModal />
            <p className="max-w-md text-center font-mono text-[10px] leading-relaxed text-ivory/40 lg:text-left">
              {AGE_NOTE}
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
