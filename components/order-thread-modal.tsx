"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { X, Send, MessageSquare, Loader2 } from "lucide-react"
import { getOrCreateThread, sendMessage, type OrderThread } from "@/app/actions/messaging"
import { statusMeta } from "@/lib/order-status"

interface Props {
  orderId: number
  onClose: () => void
}

export function OrderThreadModal({ orderId, onClose }: Props) {
  const [thread, setThread] = useState<OrderThread | null>(null)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState("")
  const [pending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getOrCreateThread(orderId).then((t) => {
      setThread(t)
      setLoading(false)
    })
  }, [orderId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [thread?.messages.length])

  function handleSend() {
    if (!thread || !input.trim()) return
    const content = input.trim()
    setInput("")
    startTransition(async () => {
      await sendMessage(thread.id, content)
      const updated = await getOrCreateThread(orderId)
      setThread(updated)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  const meta = thread ? statusMeta(thread.status) : null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-void/80 backdrop-blur-sm sm:items-center p-4">
      <div className="w-full max-w-lg bg-surface border border-white/10 flex flex-col"
           style={{ maxHeight: "80vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-4 w-4 text-violet-electric" />
            <div>
              <p className="font-display text-sm tracking-wide">Commande #{orderId}</p>
              {meta && (
                <span className={`font-mono text-[10px] uppercase tracking-widest ${meta.color}`}>
                  {meta.label}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 text-ivory/40 transition hover:text-ivory">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-violet-electric/50" />
            </div>
          ) : !thread ? (
            <p className="text-center font-mono text-sm text-ivory/40">Erreur de chargement.</p>
          ) : thread.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <MessageSquare className="h-8 w-8 text-ivory/20" />
              <p className="font-mono text-xs text-ivory/40 text-center">
                Aucun message.<br />Pose ta question directement ici.
              </p>
            </div>
          ) : (
            thread.messages.map((msg) => {
              const isClient = msg.author === "client"
              return (
                <div key={msg.id}
                  className={`flex ${isClient ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 text-sm font-mono leading-relaxed
                    ${isClient
                      ? "bg-violet-electric/20 text-ivory ring-1 ring-violet-electric/30"
                      : "bg-surface/80 text-ivory/80 ring-1 ring-white/10"
                    }`}>
                    {!isClient && (
                      <p className="mb-1 text-[9px] uppercase tracking-widest text-violet-electric/70">
                        FULLTERPS33
                      </p>
                    )}
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
            placeholder="Ton message..."
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
      </div>
    </div>
  )
}
