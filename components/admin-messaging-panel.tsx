"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { Send, MessageSquare, Loader2, ChevronLeft, Trash2 } from "lucide-react"
import {
  listAllThreads,
  getThreadById,
  addMessage,
  updateThreadStatus,
  deleteThread,
  type OrderThread,
  type ThreadMessage,
} from "@/app/actions/messaging"
import { statusMeta } from "@/lib/order-status"
import { formatPrice } from "@/lib/utils"

const STATUS_OPTIONS = [
  "en_attente",
  "preparation",
  "pret",
  "en_route",
  "livre",
  "annule",
  "discussion",
]

export function AdminMessagingPanel({ initial }: { initial: OrderThread[] }) {
  const [threads, setThreads] = useState<OrderThread[]>(initial)
  const [active, setActive]   = useState<OrderThread | null>(null)
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [input, setInput]       = useState("")
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [pending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  function openThread(id: number) {
    startTransition(async () => {
      const data = await getThreadById(id)
      if (data) {
        setActive(data.thread)
        setMessages(data.messages)
        setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unreadAdmin: 0 } : t)))
      }
    })
  }

  function handleSend() {
    if (!active || !input.trim()) return
    const content = input.trim()
    setInput("")
    startTransition(async () => {
      await addMessage(active.id, "vendeur", content)
      const data = await getThreadById(active.id)
      if (data) { setActive(data.thread); setMessages(data.messages) }
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

  function handleDelete(id: number) {
    startTransition(async () => {
      const r = await deleteThread(id)
      if (r.ok) {
        setThreads((prev) => prev.filter((t) => t.id !== id))
        if (active?.id === id) { setActive(null); setMessages([]) }
      }
      setConfirmId(null)
    })
  }

  async function handleStatusChange(id: number, status: string) {
    await updateThreadStatus(id, status)
    const data = await getThreadById(id)
    if (data) { setActive(data.thread); setMessages(data.messages) }
    const all = await listAllThreads()
    setThreads(all)
  }

  const totalUnread = threads.reduce((s, t) => s + t.unreadAdmin, 0)

  return (
    <div className="flex h-[calc(100vh-10rem)] overflow-hidden border border-white/10 bg-surface/20">

      {/* Thread list */}
      <div className={`w-full shrink-0 border-r border-white/10 md:w-72 ${active ? "hidden md:flex md:flex-col" : "flex flex-col"}`}>
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <MessageSquare className="h-4 w-4 text-violet-electric" />
          <span className="font-mono text-xs uppercase tracking-widest">Messages</span>
          {totalUnread > 0 && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center bg-violet-electric px-1.5 font-mono text-[9px] text-void">
              {totalUnread}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <p className="p-6 text-center font-mono text-xs text-ivory/30">Aucun fil de discussion.</p>
          ) : (
              threads.map((t) => {
              const meta = statusMeta(t.status)
              const label = t.customerName ?? t.pseudo ?? (t.userToken ? t.userToken.slice(0, 8) : "—")
              return (
                <div
                  key={t.id}
                  className={`group relative border-b border-white/5 transition hover:bg-white/5 ${active?.id === t.id ? "border-l-2 border-l-violet-electric bg-violet-electric/10" : ""}`}
                >
                  <button
                    onClick={() => openThread(t.id)}
                    className="w-full px-4 py-3 text-left"
                  >
                    <div className="flex items-center justify-between pr-6">
                      <span className="font-display text-sm tracking-wide text-ivory">{label}</span>
                      {t.unreadAdmin > 0 && (
                        <span className="flex h-4 w-4 items-center justify-center bg-violet-electric font-mono text-[8px] text-void">
                          {t.unreadAdmin}
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[10px] text-ivory/40">
                      #{t.id} {t.summary ? `· ${t.summary.slice(0, 30)}` : ""}
                    </p>
                    <span className={`font-mono text-[9px] uppercase tracking-widest ${meta.color}`}>{meta.label}</span>
                  </button>

                  {/* Bouton supprimer */}
                  {confirmId === t.id ? (
                    <div className="flex items-center gap-1 border-t border-white/5 px-4 py-2">
                      <button
                        disabled={pending}
                        onClick={() => handleDelete(t.id)}
                        className="flex-1 border border-signal/30 bg-signal/10 py-1 font-mono text-[9px] uppercase tracking-widest text-signal transition hover:bg-signal/20 disabled:opacity-40"
                      >
                        Confirmer
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="flex-1 border border-white/10 py-1 font-mono text-[9px] text-ivory/40 transition hover:text-ivory"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmId(t.id) }}
                      className="absolute right-2 top-3 hidden p-1.5 text-ivory/20 transition hover:text-signal group-hover:block"
                      aria-label="Supprimer la conversation"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className={`flex-1 flex-col ${!active ? "hidden md:flex" : "flex"}`}>
        {!active ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="space-y-3 text-center">
              <MessageSquare className="mx-auto h-10 w-10 text-ivory/10" />
              <p className="font-mono text-xs text-ivory/30">Sélectionne un fil</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3">
              <button onClick={() => { setActive(null); setMessages([]) }} className="p-1 text-ivory/40 hover:text-ivory md:hidden">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm tracking-wide">
                  {active.customerName ?? active.pseudo ?? active.userToken?.slice(0, 12) ?? "—"}
                </p>
                <p className="font-mono text-[10px] text-ivory/40">
                  #{active.id} {active.total ? `· ${formatPrice(active.total)}` : ""} {active.fulfillment ? `· ${active.fulfillment}` : ""}
                  {active.scheduledDate ? ` · ${active.scheduledDate} ${active.scheduledSlot ?? ""}` : ""}
                </p>
              </div>
              {/* Sélecteur de statut */}
              <select
                value={active.status}
                onChange={(e) => handleStatusChange(active.id, e.target.value)}
                className="border border-white/15 bg-void px-2 py-1 font-mono text-[10px] uppercase text-ivory outline-none focus:border-violet-electric"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{statusMeta(s).label}</option>
                ))}
              </select>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {pending && messages.length === 0 ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-violet-electric/40" />
                </div>
              ) : messages.length === 0 ? (
                <p className="py-8 text-center font-mono text-xs text-ivory/30">Aucun message.</p>
              ) : (
                messages.map((msg) => {
                  const isVendeur = msg.author === "vendeur" || msg.author === "admin"
                  return (
                    <div key={msg.id} className={`flex ${isVendeur ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-4 py-2.5 font-mono text-sm leading-relaxed ${isVendeur ? "bg-violet-electric/20 text-ivory ring-1 ring-violet-electric/30" : "bg-void text-ivory/80 ring-1 ring-white/10"}`}>
                        <p>{msg.content}</p>
                        <p className="mt-1 text-[9px] text-ivory/30">
                          {new Date(msg.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex gap-3 border-t border-white/10 px-4 py-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Répondre…"
                className="flex-1 border border-white/10 bg-void px-4 py-2.5 font-mono text-sm text-ivory outline-none placeholder:text-ivory/30 focus:border-violet-electric/60"
              />
              <button
                onClick={handleSend}
                disabled={pending || !input.trim()}
                className="flex h-11 w-11 items-center justify-center bg-violet-electric/20 text-violet-electric ring-1 ring-violet-electric/40 transition hover:bg-violet-electric/30 disabled:opacity-40"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
