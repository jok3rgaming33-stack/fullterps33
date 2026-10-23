"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Bell, Fingerprint, Loader2 } from "lucide-react"
import {
  finishCustomerWebAuthnRegistration,
  getConnectionPromptState,
  startCustomerWebAuthnRegistration,
} from "@/app/actions/webauthn"
import { enableCustomerPush } from "@/lib/push-client"
import { browserSupportsWebAuthnSync, loadWebAuthnBrowser } from "@/lib/webauthn-browser"
import type { RegistrationResponseJSON } from "@simplewebauthn/server"

const SESSION_KEY = "ft33_conn_prompt"

/**
 * Propose la biométrie et les notifications au client connecté,
 * à chaque nouvelle session tant que ce n'est pas activé.
 * Pas sur la page d'inscription, pour ne pas cacher le token.
 */
export function ConnectionPrompts() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [needBio, setNeedBio] = useState(false)
  const [needPush, setNeedPush] = useState(false)
  const [bioSupported, setBioSupported] = useState(false)
  const [busy, setBusy] = useState<"bio" | "push" | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pathname || pathname.startsWith("/signup")) return
    if (sessionStorage.getItem(SESSION_KEY) === "1") return
    let cancelled = false
    ;(async () => {
      const state = await getConnectionPromptState()
      if (!state.loggedIn || cancelled) return
      const supported = browserSupportsWebAuthnSync()
      if (!state.needBio && !state.needPush) return
      if (!supported && !state.needPush) return
      setNeedBio(state.needBio && supported)
      setNeedPush(state.needPush)
      setBioSupported(supported)
      if ((state.needBio && supported) || state.needPush) setOpen(true)
    })().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [pathname])

  function later() {
    sessionStorage.setItem(SESSION_KEY, "1")
    setOpen(false)
  }

  async function activateBio() {
    setBusy("bio")
    setError(null)
    try {
      const api = await loadWebAuthnBrowser()
      if (!api) {
        setError("Cet appareil ne propose pas la biométrie.")
        return
      }
      const started = await startCustomerWebAuthnRegistration()
      if (!started.ok) {
        setError(started.error)
        return
      }
      const response = (await api.startRegistration({ optionsJSON: started.options })) as unknown as RegistrationResponseJSON
      const done = await finishCustomerWebAuthnRegistration({
        challengeId: started.challengeId,
        response,
      })
      if (!done.ok) {
        setError(done.error)
        return
      }
      setNeedBio(false)
      if (!needPush) later()
    } catch {
      setError("Activation annulée ou refusée par l'appareil.")
    } finally {
      setBusy(null)
    }
  }

  async function activatePush() {
    setBusy("push")
    setError(null)
    try {
      const result = await enableCustomerPush()
      if (!result.ok) {
        setError(result.error)
        return
      }
      setNeedPush(false)
      if (!needBio) later()
    } catch {
      setError("Activation des notifications impossible.")
    } finally {
      setBusy(null)
    }
  }

  if (!open || (!needBio && !needPush)) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-void/75 p-4 sm:items-center">
      <div className="w-full max-w-md border border-white/10 bg-surface p-6 shadow-glow" role="dialog" aria-labelledby="conn-prompt-title">
        <p id="conn-prompt-title" className="font-display text-2xl tracking-wide text-ivory">
          Sur cet appareil
        </p>
        <p className="mt-2 font-mono text-xs leading-relaxed text-ivory/60">
          Tu peux activer la connexion biométrique et les notifications. Tant que ce n&apos;est pas fait, cette proposition revient à chaque connexion.
        </p>

        <div className="mt-5 flex flex-col gap-3">
          {needBio && bioSupported && (
            <button
              type="button"
              onClick={() => void activateBio()}
              disabled={busy !== null}
              className="flex items-center justify-center gap-2 border border-violet-electric/40 bg-violet-electric/15 px-4 py-3 font-mono text-xs uppercase tracking-widest text-violet-electric disabled:opacity-50"
            >
              {busy === "bio" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
              Activer la biométrie
            </button>
          )}
          {needPush && (
            <button
              type="button"
              onClick={() => void activatePush()}
              disabled={busy !== null}
              className="flex items-center justify-center gap-2 border border-white/15 bg-void px-4 py-3 font-mono text-xs uppercase tracking-widest text-ivory disabled:opacity-50"
            >
              {busy === "push" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              Activer les notifications
            </button>
          )}
        </div>

        {error && <p className="mt-3 font-mono text-[11px] text-red-400">{error}</p>}

        <button
          type="button"
          onClick={later}
          className="mt-4 w-full font-mono text-[11px] uppercase tracking-widest text-ivory/40 hover:text-ivory"
        >
          Plus tard
        </button>
      </div>
    </div>
  )
}
