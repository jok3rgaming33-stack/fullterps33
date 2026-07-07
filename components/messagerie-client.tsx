"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, MessageSquare, Send, Loader2, Plus } from "lucide-react"
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
  userData: UserData
  initialThreads: OrderThread[]
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  })
}

export function MessagerieClient({ userData, initialThreads }: Props) {
  const token = userData?.token ?? ""
  const name  = userData?.pseudo ?? "Client"

  const [threads, setThreads]       = useState<OrderThread[]>(initialThreads)
  const [view, setView]             = useState<"list" | "compose" | "thread">("list")
  const [selected, setSelected]     = useState<OrderThread | null>(null)
  const [messages, setMessages]     = useState<ThreadMessage[]>([])
  const [loadingThread, setLoading] = useState(false)
  const [reply, setReply]           = useState("")
  const [sending, setSending]       = useState(false)
  const [composeText, setCompose]   = useState("")
  const [creating, setCreating]     = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Poll liste toutes les 8s
  useEffect(() => {
    if (!token) return
    const id = setInterval(() => {
      getThreadsForToken(token).then(setThreads).catch(() => {})
    }, 8000)
    return () => clearInterval(id)
  }, [token])

  // Poll messages du fil actif toutes les 5s
  useEffect(() => {
    if (!selected) return
    const id = setInterval(() => {
      getThread(selected.id)
        .then((r) => { if (r) setMessages(r.messages) })
        .catch(() => {})
    }, 5000)
    return () => clearInterval(id)
  }, [selected])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function openThread(t: OrderThread) {
    setSelected(t)
    setView("thread")
    setLoading(true)
    const r = await getThread(t.id)
    if (r) setMessages(r.messages)
    setLoading(false)
    // Rafraîchir compteur non-lus
    getThreadsForToken(token).then(setThreads).catch(() => {})
  }

  async function handleSend() {
    if (!reply.trim() || !selected || sending) return
    setSending(true)
    const body = reply.trim()
    setReply("")
    const r = await addMessage(selected.id, "client", body)
    if (r && "id" in r) setMessages((prev) => [...prev, r as unknown as ThreadMessage])
    setSending(false)
  }

  async function handleCreate() {
    if (!composeText.trim() || creating) return
    setCreating(true)
    const r = await createGeneralInquiryThread({ customerName: name, customerToken: token, message: composeText })
    if (r.ok) {
      const updated = await getThreadsForToken(token)
      setThreads(updated)
      const newThread = updated.find((t) => t.id === r.id)
      if (newThread) {
        await openThread(newThread)
      }
    }
    setCompose("")
    setCreating(false)
  }

  // ── Vue liste ─────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <button
            onClick={() => setView("compose")}
            className="flex items-center gap-2 border border-violet-electric/30 bg-violet-electric/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-violet-electric transition hover:bg-violet-electric/20"
          >
            <Plus className="h-3.5 w-3.5" /> Nouveau message
          </button>
        </div>

        {threads.length === 0 ? (
          <div className="border border-white/10 bg-surface/40 p-12 text-center">
            <MessageSquare className="mx-auto mb-4 h-8 w-8 text-ivory/20" />
            <p className="font-mono text-sm text-ivory/40">Aucune conversation</p>
            <p className="mt-1 font-mono text-xs text-ivory/25">
              Crée un message ou passe une commande pour démarrer
            </p>
          </div>
        ) : (
          threads.map((t) => {
            const meta = statusMeta(t.status)
            return (
              <button
                key={t.id}
                onClick={() => openThread(t)}
                className="w-full border border-white/10 bg-surface/40 p-4 text-left transition hover:bg-surface/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm text-ivory">
                      {t.summary ?? t.orderId ? `Commande #${t.orderId}` : "Demande générale"}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-ivory/40">
                      {fmtDate(t.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span
                      className="px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest"
                      style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}33` }}
                    >
                      {meta.label}
                    </span>
                    {t.unreadClient > 0 && (
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-violet-electric font-mono text-[9px] font-bold text-void">
                        {t.unreadClient > 9 ? "9+" : t.unreadClient}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    )
  }

  // ── Vue compose ───────────────────────────────────────────────────────────
  if (view === "compose") {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setView("list")}
          className="flex items-center gap-2 font-mono text-xs text-ivory/50 transition hover:text-ivory"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </button>
        <div className="border border-white/10 bg-surface/40 p-6 space-y-4">
          <h2 className="font-display text-lg">Nouveau message</h2>
          <textarea
            value={composeText}
            onChange={(e) => setCompose(e.target.value)}
            placeholder="Écris ton message ici…"
            rows={5}
            className="w-full resize-none border border-white/10 bg-void px-3 py-2.5 font-mono text-sm text-ivory outline-none focus:border-violet-electric/50"
          />
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={creating || !composeText.trim()}
              className="flex items-center gap-2 border border-violet-electric/30 bg-violet-electric/15 px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-violet-electric transition hover:bg-violet-electric/25 disabled:opacity-40"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Envoyer
            </button>
            <button
              onClick={() => setView("list")}
              className="border border-white/10 px-4 py-2 font-mono text-xs text-ivory/40 transition hover:text-ivory"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Vue thread ────────────────────────────────────────────────────────────
  const meta = selected ? statusMeta(selected.status) : null

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => { setView("list"); setSelected(null); setMessages([]) }}
        className="flex items-center gap-2 font-mono text-xs text-ivory/50 transition hover:text-ivory"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour
      </button>

      {/* Header fil */}
      <div className="flex items-center justify-between border border-white/10 bg-surface/40 px-4 py-3">
        <div>
          <p className="font-display text-sm text-ivory">
            {selected?.summary ?? (selected?.orderId ? `Commande #${selected.orderId}` : "Demande générale")}
          </p>
          {selected?.createdAt && (
            <p className="font-mono text-[10px] text-ivory/40">{fmtDate(selected.createdAt)}</p>
          )}
        </div>
        {meta && (
          <span
            className="px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest"
            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}33` }}
          >
            {meta.label}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex max-h-[500px] flex-col gap-3 overflow-y-auto border border-white/10 bg-void/60 p-4">
        {loadingThread ? (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-ivory/30" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center font-mono text-xs text-ivory/30">Aucun message</p>
        ) : (
          messages.map((m) => {
            const isClient = m.author === "client" || m.author === name
            return (
              <div key={m.id} className={`flex flex-col gap-0.5 ${isClient ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 font-mono text-sm leading-relaxed ${
                    isClient
                      ? "bg-violet-electric/20 text-ivory"
                      : "bg-surface/60 text-ivory/80"
                  }`}
                >
                  {m.content}
                </div>
                <p className="font-mono text-[9px] text-ivory/25">{fmtDate(m.createdAt)}</p>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSend()
          }}
          placeholder="Votre réponse…"
          className="flex-1 border border-white/10 bg-void px-3 py-2.5 font-mono text-sm text-ivory outline-none focus:border-violet-electric/50"
        />
        <button
          onClick={handleSend}
          disabled={sending || !reply.trim()}
          className="border border-violet-electric/30 bg-violet-electric/15 px-4 py-2.5 text-violet-electric transition hover:bg-violet-electric/25 disabled:opacity-40"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
