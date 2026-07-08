"use client"

import { useState, useEffect } from "react"
import { X, BellRing } from "lucide-react"
import type { NewsItem } from "@/app/actions/settings"

const TYPE_STYLES = {
  info:    { border: "border-sky-400/40",             icon: "text-sky-400"             },
  warning: { border: "border-amber-400/40",           icon: "text-amber-400"           },
  alert:   { border: "border-signal/40",              icon: "text-signal"              },
  promo:   { border: "border-violet-electric/40",     icon: "text-violet-electric"     },
}

export function NewsPopupClient({ item }: { item: NewsItem }) {
  const [open, setOpen] = useState(false)
  const storageKey = `ft33-popup-${item.id}`

  useEffect(() => {
    const seen = sessionStorage.getItem(storageKey)
    if (!seen) setOpen(true)
  }, [storageKey])

  function close() {
    sessionStorage.setItem(storageKey, "1")
    setOpen(false)
  }

  if (!open) return null

  const style = TYPE_STYLES[item.type as keyof typeof TYPE_STYLES] ?? TYPE_STYLES.info

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-void/70 backdrop-blur-sm p-4">
      <div className={`w-full max-w-sm border ${style.border} bg-surface shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <BellRing className={`h-4 w-4 ${style.icon}`} />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/60">
              Annonce
            </span>
          </div>
          <button onClick={close} className="text-ivory/30 transition hover:text-ivory">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-6 space-y-3">
          <h2 className="font-display text-xl tracking-wide text-ivory">{item.title}</h2>
          <p className="font-mono text-sm leading-relaxed text-ivory/70">{item.body}</p>
        </div>
        <div className="border-t border-white/10 px-5 py-4">
          <button
            onClick={close}
            className="w-full bg-violet-electric/15 py-2.5 font-mono text-xs uppercase tracking-widest text-violet-electric ring-1 ring-violet-electric/30 transition hover:bg-violet-electric/25"
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  )
}
