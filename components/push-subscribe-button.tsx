'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { subscribePush, unsubscribePush } from '@/app/actions/push'

export function PushSubscribeButton() {
  const [status, setStatus] = useState<'idle' | 'subscribed' | 'unsupported' | 'loading'>('idle')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription()
      setStatus(existing ? 'subscribed' : 'idle')
    })
  }, [])

  async function toggle() {
    if (status === 'unsupported') return
    setStatus('loading')
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

    try {
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      await subscribePush(json)
      setStatus('subscribed')
    } catch {
      setStatus('idle')
    }
  }

  if (status === 'unsupported') return null

  return (
    <button
      onClick={toggle}
      disabled={status === 'loading'}
      aria-label={status === 'subscribed' ? 'Désactiver les notifications' : 'Activer les notifications'}
      className="flex items-center gap-2 clip-tag border border-white/20 bg-surface/60 px-4 py-2 font-mono text-xs uppercase tracking-widest text-ivory/70 transition hover:bg-surface hover:text-ivory disabled:opacity-40"
    >
      {status === 'subscribed' ? <BellOff size={14} /> : <Bell size={14} />}
      {status === 'subscribed' ? 'Notifs ON' : 'Activer notifs'}
    </button>
  )
}
