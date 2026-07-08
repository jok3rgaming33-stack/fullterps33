"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { X, Send, MessageSquare, Loader2 } from "lucide-react"
import { getOrCreateThread, getThreadById, addMessage, type ThreadMessage } from "@/app/actions/messaging"
import { statusMeta } from "@/lib/order-status"

interface Props {
  orderId: number
  onClose: () => void
}

export function OrderThreadModal({ orderId, onClose }: Props) {
  const [threadId, setThreadId]   = useState<number | null>(null)
  const [status, setStatus]       = useState<string>("en_attente")
  const [messages, setMessages]   = useState<ThreadMessage[]>([])
  const [loading, setLoading]     = useState(true)
  const [input, setInput]         = useState("")
  const [pending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getOrCreateThread(orderId).then((t) => {
      if (t) {
        setThreadId(t.id)
        setMessages(t.messages)
      }
      setLoading(false)
    })
  }, [orderId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  function handleSend() {
    if (!threadId || !input.trim()) return
    const content = input.trim()
    setInput("")
    startTransition(async () => {
      await addMessage(threadId, "client", content)
      const data = await getThreadById(threadId)
      if (data) { setMessages(data.messages); setStatus(data.thread.status) }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  const meta = statusMeta(status)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-void/80 p-4 sm:items-center">
      <div className="flex w-full max-w-lg flex-col border border-white/10 bg-surface" style={{ maxHeight: "80vh" }}>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <MessageSquare className="h-4 w-4 shrink-0 text-violet-electric" />
            <div className="min-w-0">
              <p className="font-display text-sm tracking-wide">Commande #{orderId}</p>
              <span className={`font-mono text-[10px] uppercase tracking-widest ${meta.color}`}>{meta.label}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 rounded-sm p-2 text-ivory/40 transition hover:bg-white/10 hover:text-ivory"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-violet-electric/50" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <MessageSquare className="h-8 w-8 text-ivory/20" />
              <p className="text-center font-mono text-xs text-ivory/40">Aucun message.<br />Pose ta question directement ici.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isClient = msg.author === "client"
              return (
                <div key={msg.id} className={`flex ${isClient ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 font-mono text-sm leading-relaxed ${isClient ? "bg-violet-electric/20 text-ivory ring-1 ring-violet-electric/30" : "bg-surface/80 text-ivory/80 ring-1 ring-white/10"}`}>
                    {!isClient && (
                      <p className="mb-1 text-[9px] uppercase tracking-widest text-violet-electric/70">FULLTERPS33</p>
                    )}
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
            placeholder="Ton message..."
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
      </div>
    </div>
  )
}
