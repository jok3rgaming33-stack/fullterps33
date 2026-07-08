'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2, AlertCircle } from 'lucide-react'
import { subscribePush, unsubscribePush } from '@/app/actions/push'

/** Convertit une clé VAPID base64url en Uint8Array requis par pushManager.subscribe() */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function PushSubscribeButton() {
  const [status, setStatus] = useState<'idle' | 'subscribed' | 'unsupported' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription()
      setStatus(existing ? 'subscribed' : 'idle')
    }).catch(() => setStatus('idle'))
  }, [])

  async function toggle() {
    if (status === 'unsupported' || status === 'loading') return
    setStatus('loading')
    setErrorMsg(null)

    try {
      const reg = await navigator.serviceWorker.ready

      if (status === 'subscribed') {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await sub.unsubscribe()
          await unsubscribePush(sub.endpoint)
        }
        setStatus('idle')
        return
      }

      // Vérification que la clé VAPID est disponible
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        setErrorMsg('Clé VAPID manquante')
        setStatus('error')
        return
      }

      // Demande de permission navigateur si nécessaire
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setErrorMsg('Permission refusée')
        setStatus('idle')
        return
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      const result = await subscribePush(json)

      if (!result.ok) {
        setErrorMsg('Erreur serveur')
        setStatus('error')
        return
      }

      setStatus('subscribed')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue')
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  if (status === 'unsupported') return null

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={toggle}
        disabled={status === 'loading'}
        aria-label={status === 'subscribed' ? 'Désactiver les notifications' : 'Activer les notifications'}
        className="flex items-center gap-2 clip-tag border border-white/20 bg-surface/60 px-4 py-2 font-mono text-xs uppercase tracking-widest text-ivory/70 transition hover:bg-surface hover:text-ivory disabled:opacity-40"
      >
        {status === 'loading' && <Loader2 size={14} className="animate-spin" />}
        {status === 'subscribed' && <BellOff size={14} />}
        {status === 'error' && <AlertCircle size={14} className="text-red-400" />}
        {status === 'idle' && <Bell size={14} />}
        {status === 'loading'    ? 'Activation…'      :
         status === 'subscribed' ? 'Notifs ON'        :
         status === 'error'      ? 'Réessayer'        :
                                   'Activer notifs'}
      </button>
      {errorMsg && (
        <p className="font-mono text-[10px] text-red-400">{errorMsg}</p>
      )}
    </div>
  )
}
