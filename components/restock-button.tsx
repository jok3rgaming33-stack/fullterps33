"use client"

import { useState } from "react"
import { Bell, BellOff, Loader2 } from "lucide-react"
import { subscribeRestock, unsubscribeRestock } from "@/app/actions/restock"

type Props = {
  productId: string
  subscribed?: boolean
}

export function RestockButton({ productId, subscribed: initialSubscribed = false }: Props) {
  const [subscribed, setSubscribed] = useState(initialSubscribed)
  const [loading, setLoading]       = useState(false)
  const [feedback, setFeedback]     = useState<string | null>(null)

  function showFb(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  async function toggle() {
    setLoading(true)
    if (subscribed) {
      const r = await unsubscribeRestock(productId)
      if (r.ok) setSubscribed(false)
      showFb(r.ok ? "Alerte désactivée" : "Erreur")
    } else {
      const r = await subscribeRestock(productId)
      if (r.ok) setSubscribed(true)
      showFb(r.message)
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={toggle}
        disabled={loading}
        aria-label={subscribed ? "Désactiver l'alerte restock" : "Être alerté du retour en stock"}
        className={`flex items-center gap-2 border px-4 py-2 font-mono text-xs uppercase tracking-widest transition disabled:opacity-50 ${
          subscribed
            ? "border-ivory/20 bg-ivory/5 text-ivory/50 hover:border-signal/30 hover:text-signal"
            : "border-violet-electric/30 bg-violet-electric/10 text-violet-electric hover:bg-violet-electric/20"
        }`}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : subscribed ? (
          <BellOff className="h-3.5 w-3.5" />
        ) : (
          <Bell className="h-3.5 w-3.5" />
        )}
        {subscribed ? "Alerte active" : "M'alerter"}
      </button>
      {feedback && (
        <p className="font-mono text-[10px] text-ivory/40">{feedback}</p>
      )}
    </div>
  )
}
