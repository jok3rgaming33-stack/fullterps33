"use client"

import { useEffect, useRef, useState } from "react"
import { X, ArrowLeft, MessageSquare, Send, Loader2, FlaskConical, Package } from "lucide-react"
import {
  getThreadsForToken,
  getThread,
  addMessage,
  createGeneralInquiryThread,
  type OrderThread,
  type ThreadMessage,
} from "@/app/actions/messaging"
import { statusMeta } from "@/lib/order-status"

type UserData = { pseudo?: string; token?: string } | null

type Props = {
  isOpen: boolean
  onClose: () => void
  userData: UserData
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
}

export function MessagerieModal({ isOpen, onClose, userData }: Props) {
  const token = userData?.token ?? ""
  const name  = userData?.pseudo ?? "Client"

  const [threads, setThreads]         = useState<OrderThread[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [view, setView]               = useState<"list" | "compose" | "thread">("list")
  const [selected, setSelected]       = useState<OrderThread | null>(null)
  const [messages, setMessages]       = useState<ThreadMessage[]>([])
  const [loadingThread, setLThread]   = useState(false)
  const [reply, setReply]             = useState("")
  const [sending, setSending]         = useState(false)
  const [composeText, setCompose]     = useState("")
  const [creating, setCreating]       = useState(false)

  const selectedRef = useRef<number | null>(null)
  selectedRef.current = selected?.id ?? null
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen || !token) return
    setLoadingList(true)
    getThreadsForToken(token)
      .then((d) => setThreads(d))
      .catch(() => setThreads([]))
      .finally(() => setLoadingList(false))
  }, [isOpen, token])

  useEffect(() => {
    if (!isOpen || !token) return
    const id = setInterval(async () => {
      try {
        const list = await getThreadsForToken(token)
        setThreads(list)
        if (selectedRef.current != null) {
          const data = await getThread(selectedRef.current)
          if (data) setMessages(data.messages)
        }
      } catch { /* silencieux */ }
    }, 8000)
    return () => clearInterval(id)
  }, [isOpen, token])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const openThread = async (thread: OrderThread) => {
    setSelected(thread)
    setView("thread")
    setLThread(true)
    setMessages([])
    try {
      const data = await getThread(thread.id)
      if (data) setMessages(data.messages)
    } finally {
      setLThread(false)
    }
  }

  const handleSend = async () => {
    if (!selected || !reply.trim() || sending) return
    setSending(true)
    try {
      await addMessage(selected.id, "client", reply)
      const data = await getThread(selected.id)
      if (data) setMessages(data.messages)
      setReply("")
    } finally {
      setSending(false)
    }
  }

  const handleCreate = async () => {
    if (!composeText.trim() || creating) return
    setCreating(true)
    try {
      const res = await createGeneralInquiryThread({ customerName: name, customerToken: token || undefined, message: composeText })
      if (res.ok) {
        setCompose("")
        const list = await getThreadsForToken(token)
        setThreads(list)
        const created = list.find((t) => t.id === res.id)
        if (created) await openThread(created)
        else setView("list")
      }
    } finally {
      setCreating(false)
    }
  }

  const handleClose = () => {
    setView("list"); setSelected(null); setMessages([]); setReply(""); setCompose(""); onClose()
  }
  const goBack = () => {
    setView("list"); setSelected(null); setMessages([]); setReply(""); setCompose("")
  }

  if (!isOpen) return null

  const title = view === "thread"
    ? selected?.status === "discussion" ? "Discussion" : `Commande #${selected?.id}`
    : view === "compose" ? "Contacter le chimiste" : "Messagerie"

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-void/90 p-4"
      role="dialog" aria-modal="true" aria-label="Messagerie"
    >
      <div className="flex max-h-[85vh] w-full max-w-md flex-col border border-white/10 bg-surface">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            {view !== "list" && (
              <button onClick={goBack} className="grid h-9 w-9 place-items-center border border-white/15 text-ivory/70 hover:border-violet-electric hover:text-violet-electric" aria-label="Retour">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="font-display text-xl tracking-wide">{title}</h2>
          </div>
          <button onClick={handleClose} className="grid h-9 w-9 place-items-center border border-white/15 text-ivory/70 hover:border-violet-electric hover:text-violet-electric" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Liste */}
        {view === "list" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b border-white/10 p-4">
              <button
                onClick={() => setView("compose")}
                className="clip-tag flex w-full items-center justify-center gap-2 bg-violet-electric py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-void transition hover:brightness-110"
              >
                <FlaskConical className="h-4 w-4" />
                Contacter le chimiste
              </button>
            </div>
            <div className="flex-1 overflow-y-auto scroll-thin p-4">
              {loadingList ? (
                <div className="flex items-center justify-center py-12 text-ivory/40">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : threads.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center text-ivory/40">
                  <MessageSquare className="h-10 w-10" />
                  <p className="font-mono text-sm">Aucune discussion pour le moment.</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {threads.map((t) => {
                    const meta = statusMeta(t.status)
                    const isGeneral = t.status === "discussion"
                    return (
                      <li key={t.id}>
                        <button
                          onClick={() => openThread(t)}
                          className="flex w-full items-center justify-between gap-3 border border-white/10 bg-void/60 p-4 text-left transition hover:border-violet-electric/50"
                        >
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center border border-white/15 text-ivory/50">
                              {isGeneral ? <FlaskConical className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                            </span>
                            <div>
                              <p className="font-display text-sm tracking-wide">
                                {isGeneral ? "Discussion générale" : `Commande #${t.id}`}
                              </p>
                              <p className="mt-0.5 font-mono text-[11px] text-ivory/40">
                                {formatDate(t.updatedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`font-mono text-[10px] uppercase tracking-wider ${meta.color}`}>
                              {meta.label}
                            </span>
                            {t.unreadClient > 0 && (
                              <span className="grid h-5 w-5 place-items-center rounded-full bg-violet-electric font-mono text-[10px] font-bold text-void">
                                {t.unreadClient}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Compose */}
        {view === "compose" && (
          <div className="flex flex-1 flex-col p-5 gap-4">
            <p className="font-mono text-xs text-ivory/50">
              Une question sur un produit, une commande, ou autre chose ? Envoie ton message ici.
            </p>
            <textarea
              value={composeText}
              onChange={(e) => setCompose(e.target.value)}
              placeholder="Ton message…"
              rows={6}
              className="w-full flex-1 resize-none border border-white/15 bg-void p-3 font-mono text-sm text-ivory outline-none focus:border-violet-electric placeholder:text-ivory/30"
            />
            <button
              onClick={handleCreate}
              disabled={!composeText.trim() || creating}
              className="clip-tag flex items-center justify-center gap-2 bg-violet-electric py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-void transition hover:brightness-110 disabled:opacity-60"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Envoyer</>}
            </button>
          </div>
        )}

        {/* Thread */}
        {view === "thread" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-3">
              {loadingThread ? (
                <div className="flex items-center justify-center py-12 text-ivory/40">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <p className="py-8 text-center font-mono text-sm text-ivory/30">Aucun message.</p>
              ) : (
                messages.map((m) => {
                  const isClient = m.author === "client"
                  return (
                    <div key={m.id} className={`flex ${isClient ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] border px-4 py-2.5 ${isClient ? "border-violet-electric/40 bg-violet-electric/10 text-ivory" : "border-white/10 bg-void text-ivory/80"}`}>
                        <p className="font-mono text-sm leading-relaxed">{m.content}</p>
                        <p className="mt-1 font-mono text-[10px] text-ivory/30">{formatDate(m.createdAt)}</p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Réponse */}
            <div className="border-t border-white/10 p-4">
              <div className="flex gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSend() }}
                  placeholder="Ton message…"
                  className="min-w-0 flex-1 border border-white/15 bg-void px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric placeholder:text-ivory/30"
                />
                <button
                  onClick={handleSend}
                  disabled={!reply.trim() || sending}
                  aria-label="Envoyer"
                  className="grid h-10 w-10 shrink-0 place-items-center border border-white/15 text-ivory/70 hover:border-violet-electric hover:text-violet-electric disabled:opacity-50 transition"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
