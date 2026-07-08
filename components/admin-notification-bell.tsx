"use client"

import { useEffect, useState, useTransition } from "react"
import { Bell } from "lucide-react"
import { listAllThreads } from "@/app/actions/messaging"

type NotifItem = {
  id: number
  label: string
  preview: string
  time: string
  type: "order" | "message" | "kyc" | "register"
}

export function AdminNotificationBell() {
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<NotifItem[]>([])
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()

  const refresh = () => {
    startTransition(async () => {
      try {
        const threads = await listAllThreads()
        const unreadThreads = threads.filter((t) => t.unreadAdmin > 0)
        setUnread(unreadThreads.length)
        setItems(
          unreadThreads.slice(0, 8).map((t) => ({
            id: t.id,
            label: t.customerName ?? "Client",
            preview: t.summary ?? "Nouveau message",
            time: new Date(t.updatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
            type: t.status === "discussion" ? "message" : "order",
          }))
        )
      } catch { /* silencieux */ }
    })
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 20000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center gap-1.5 text-ivory/70 transition hover:text-violet-electric"
        aria-label={unread > 0 ? `${unread} notification(s) non lue(s)` : "Notifications admin"}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-signal font-mono text-[9px] font-bold text-void">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Overlay cliquable pour fermer */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-8 z-50 w-80 border border-white/10 bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="font-mono text-xs uppercase tracking-widest text-ivory/60">Notifications</p>
              {unread > 0 && (
                <span className="font-mono text-[10px] text-signal">{unread} non lu{unread > 1 ? "s" : ""}</span>
              )}
            </div>

            {items.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="font-mono text-xs text-ivory/30">Aucune notification en attente</p>
              </div>
            ) : (
              <ul className="max-h-72 overflow-y-auto">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 border-b border-white/5 px-4 py-3 last:border-0 hover:bg-white/5 transition"
                  >
                    {/* Indicateur type */}
                    <span
                      className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                        item.type === "message" ? "bg-violet-electric" : "bg-neon-green"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-bold text-ivory truncate">
                        {item.type === "order" ? `Commande #${item.id}` : `Message #${item.id}`}
                        <span className="ml-1 font-normal text-ivory/40">— {item.label}</span>
                      </p>
                      <p className="font-mono text-[10px] text-ivory/40 truncate mt-0.5">{item.preview}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[9px] text-ivory/30 mt-0.5">{item.time}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-white/10 px-4 py-2">
              <p className="font-mono text-[10px] text-ivory/20 text-center">
                Rafraîchi toutes les 20s
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
