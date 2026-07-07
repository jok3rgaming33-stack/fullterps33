"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { Send, MessageSquare, Loader2, ChevronLeft } from "lucide-react"
import {
  listAllThreads,
  getThreadById,
  sendMessage,
  type OrderThread,
} from "@/app/actions/messaging"
import { statusMeta } from "@/lib/order-status"
import { formatPrice } from "@/lib/utils"

export function AdminMessagingPanel({ initial }: { initial: OrderThread[] }) {
  const [threads, setThreads] = useState<OrderThread[]>(initial)
  const [active, setActive] = useState<OrderThread | null>(null)
  const [input, setInput] = useState("")
  const [pending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [active?.messages.length])

  function openThread(id: number) {
    startTransition(async () => {
      const thread = await getThreadById(id)
      if (thread) {
        setActive(thread)
        setThreads((prev) =>
          prev.map((t) => (t.id === id ? { ...t, unreadAdmin: 0 } : t))
        )
      }
    })
  }

  function handleSend() {
    if (!active || !input.trim()) return
    const content = input.trim()
    setInput("")
    startTransition(async () => {
      await sendMessage(active.id, content)
      const updated = await getThreadById(active.id)
      if (updated) setActive(updated)
      const all = await listAllThreads()
      setThreads(all)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  const totalUnread = threads.reduce((s, t) => s + t.unreadAdmin, 0)

  return (
    <div className="flex h-[calc(100vh-10rem)] border border-white/10 bg-surface/20 overflow-hidden">

      {/* Thread list */}
      <div className={`w-full md:w-72 shrink-0 border-r border-white/10 flex flex-col
        ${active ? "hidden md:flex" : "flex"}`}>
        <div className="border-b border-white/10 px-4 py-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-violet-electric" />
          <span className="font-mono text-xs uppercase tracking-widest">
            Messages
          </span>
          {totalUnread > 0 && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center bg-violet-electric text-void font-mono text-[9px] px-1.5">
              {totalUnread}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <p className="p-6 text-center font-mono text-xs text-ivory/30">
              Aucun fil de discussion.
            </p>
          ) : (
            threads.map((t) => {
              const meta = statusMeta(t.status)
              return (
                <button
                  key={t.id}
                  onClick={() => openThread(t.id)}
                  className={`w-full text-left border-b border-white/5 px-4 py-3 transition hover:bg-white/5
                    ${active?.id === t.id ? "bg-violet-electric/10 border-l-2 border-l-violet-electric" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm tracking-wide text-ivory">
                      {t.pseudo ?? t.userToken.slice(0, 8)}
                    </span>
                    {t.unreadAdmin > 0 && (
                      <span className="h-4 w-4 bg-violet-electric text-void font-mono text-[8px] flex items-center justify-center">
                        {t.unreadAdmin}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[10px] text-ivory/40">
                    Commande #{t.orderId ?? "—"} · {t.total ? formatPrice(Number(t.total)) : "—"}
                  </p>
                  <span className={`font-mono text-[9px] uppercase tracking-widest ${meta.color}`}>
                    {meta.label}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className={`flex-1 flex flex-col ${!active ? "hidden md:flex" : "flex"}`}>
        {!active ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center space-y-3">
              <MessageSquare className="h-10 w-10 text-ivory/10 mx-auto" />
              <p className="font-mono text-xs text-ivory/30">Sélectionne un fil</p>
            </div>
          </div>
        ) : (
          <>
            {/* Conv header */}
            <div className="border-b border-white/10 px-5 py-3 flex items-center gap-3">
              <button
                onClick={() => setActive(null)}
                className="md:hidden p-1 text-ivory/40 hover:text-ivory"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm tracking-wide">
                  {active.pseudo ?? active.userToken.slice(0, 12)}
                </p>
                <p className="font-mono text-[10px] text-ivory/40">
                  Commande #{active.orderId} · {active.total ? formatPrice(Number(active.total)) : "—"}
                </p>
              </div>
              <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-1 ${statusMeta(active.status).bg} ${statusMeta(active.status).color} ring-1 ${statusMeta(active.status).ring}`}>
                {statusMeta(active.status).label}
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {pending && active.messages.length === 0 ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-violet-electric/40" />
                </div>
              ) : active.messages.length === 0 ? (
                <p className="text-center font-mono text-xs text-ivory/30 py-8">
                  Aucun message.
                </p>
              ) : (
                active.messages.map((msg) => {
                  const isAdmin = msg.author === "admin"
                  return (
                    <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-4 py-2.5 font-mono text-sm leading-relaxed
                        ${isAdmin
                          ? "bg-violet-electric/20 text-ivory ring-1 ring-violet-electric/30"
                          : "bg-void text-ivory/80 ring-1 ring-white/10"
                        }`}>
                        <p>{msg.content}</p>
                        <p className="mt-1 text-[9px] text-ivory/30">
                          {new Date(msg.createdAt).toLocaleTimeString("fr-FR", {
                            hour: "2-digit", minute: "2-digit"
                          })}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/10 px-4 py-3 flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Répondre..."
                className="flex-1 bg-void border border-white/10 px-4 py-2.5 font-mono text-sm text-ivory placeholder:text-ivory/30 outline-none focus:border-violet-electric/60"
              />
              <button
                onClick={handleSend}
                disabled={pending || !input.trim()}
                className="flex items-center justify-center w-11 h-11 bg-violet-electric/20 ring-1 ring-violet-electric/40 text-violet-electric transition hover:bg-violet-electric/30 disabled:opacity-40"
              >
                {pending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
