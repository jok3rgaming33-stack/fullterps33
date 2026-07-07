"use client"

import { useState, useTransition } from "react"
import { Plus, Trash2, Save, Zap, BellRing, Clock, Store } from "lucide-react"
import {
  setSetting,
  createNews,
  updateNews,
  deleteNews,
  type NewsItem,
} from "@/app/actions/settings"
import { useRouter } from "next/navigation"

const NEWS_TYPES = ["info", "warning", "alert", "promo"] as const
const NEWS_TYPE_META = {
  info:    { label: "Info",       color: "text-sky-400",     bg: "bg-sky-400/10",    ring: "ring-sky-400/30"    },
  warning: { label: "Attention",  color: "text-amber-400",   bg: "bg-amber-400/10",  ring: "ring-amber-400/30"  },
  alert:   { label: "Alerte",     color: "text-signal",      bg: "bg-signal/10",     ring: "ring-signal/30"     },
  promo:   { label: "Promo",      color: "text-violet-electric", bg: "bg-violet-electric/10", ring: "ring-violet-electric/30" },
}

interface Props {
  settings: Record<string, any>
  news: NewsItem[]
}

export function AdminSettingsPanel({ settings, news: initialNews }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  // Boutique
  const [shopOpen, setShopOpen]       = useState<boolean>(settings.shop_open ?? true)
  const [shopMsg, setShopMsg]         = useState<string>(settings.shop_message ?? "")

  // Créneaux livraison
  const [slots, setSlots] = useState<string[]>(settings.delivery_slots ?? [])
  const [newSlot, setNewSlot] = useState("")

  // Modes livraison
  const [modes, setModes] = useState<string[]>(settings.delivery_modes ?? [])
  const [newMode, setNewMode] = useState("")

  // News
  const [news, setNews] = useState<NewsItem[]>(initialNews)
  const [newTitle, setNewTitle] = useState("")
  const [newBody, setNewBody]   = useState("")
  const [newType, setNewType]   = useState<NewsItem["type"]>("info")
  const [newPopup, setNewPopup] = useState(false)

  function save(key: string, value: any) {
    startTransition(async () => {
      await setSetting(key, value)
      router.refresh()
    })
  }

  function addSlot() {
    if (!newSlot.trim()) return
    const updated = [...slots, newSlot.trim()]
    setSlots(updated)
    setNewSlot("")
    save("delivery_slots", updated)
  }

  function removeSlot(i: number) {
    const updated = slots.filter((_, idx) => idx !== i)
    setSlots(updated)
    save("delivery_slots", updated)
  }

  function addMode() {
    if (!newMode.trim()) return
    const updated = [...modes, newMode.trim()]
    setModes(updated)
    setNewMode("")
    save("delivery_modes", updated)
  }

  function removeMode(i: number) {
    const updated = modes.filter((_, idx) => idx !== i)
    setModes(updated)
    save("delivery_modes", updated)
  }

  function handleCreateNews() {
    if (!newTitle.trim() || !newBody.trim()) return
    startTransition(async () => {
      await createNews({ title: newTitle.trim(), body: newBody.trim(), type: newType, active: true, popup: newPopup })
      setNewTitle("")
      setNewBody("")
      setNewPopup(false)
      router.refresh()
    })
  }

  function handleToggleNews(id: number, field: "active" | "popup", val: boolean) {
    setNews((prev) => prev.map((n) => n.id === id ? { ...n, [field]: val } : n))
    startTransition(async () => {
      await updateNews(id, { [field]: val })
    })
  }

  function handleDeleteNews(id: number) {
    setNews((prev) => prev.filter((n) => n.id !== id))
    startTransition(async () => {
      await deleteNews(id)
    })
  }

  const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <div className="border border-white/10 bg-surface/40 p-5 space-y-4">
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <Icon className="h-4 w-4 text-violet-electric" />
        <h3 className="font-mono text-xs uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Statut boutique */}
      <Section icon={Store} title="Statut boutique">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-ivory/70">Boutique ouverte</span>
          <button
            onClick={() => { setShopOpen(!shopOpen); save("shop_open", !shopOpen) }}
            className={`relative h-6 w-11 rounded-full transition-colors ${shopOpen ? "bg-violet-electric" : "bg-white/10"}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-void transition-transform ${shopOpen ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
        <div className="space-y-2">
          <label className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">
            Message affiché
          </label>
          <div className="flex gap-2">
            <input
              value={shopMsg}
              onChange={(e) => setShopMsg(e.target.value)}
              className="flex-1 bg-void border border-white/10 px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60"
              placeholder="Message boutique..."
            />
            <button
              onClick={() => save("shop_message", shopMsg)}
              disabled={pending}
              className="flex items-center gap-1.5 bg-violet-electric/15 px-4 py-2 font-mono text-xs text-violet-electric ring-1 ring-violet-electric/30 transition hover:bg-violet-electric/25 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              Sauver
            </button>
          </div>
        </div>
      </Section>

      {/* Créneaux livraison */}
      <Section icon={Clock} title="Créneaux de livraison">
        <div className="flex flex-wrap gap-2">
          {slots.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-void border border-white/10 px-3 py-1.5">
              <span className="font-mono text-xs text-ivory/70">{s}</span>
              <button onClick={() => removeSlot(i)} className="text-ivory/30 hover:text-signal transition">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newSlot}
            onChange={(e) => setNewSlot(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSlot()}
            placeholder="Ex: Lundi 18h-20h"
            className="flex-1 bg-void border border-white/10 px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60"
          />
          <button onClick={addSlot} disabled={pending}
            className="flex items-center gap-1 bg-violet-electric/15 px-3 py-2 text-violet-electric ring-1 ring-violet-electric/30 hover:bg-violet-electric/25 transition disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </Section>

      {/* Modes de livraison */}
      <Section icon={Zap} title="Modes de livraison">
        <div className="flex flex-wrap gap-2">
          {modes.map((m, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-void border border-white/10 px-3 py-1.5">
              <span className="font-mono text-xs text-ivory/70">{m}</span>
              <button onClick={() => removeMode(i)} className="text-ivory/30 hover:text-signal transition">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newMode}
            onChange={(e) => setNewMode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addMode()}
            placeholder="Ex: Meet-up Bordeaux"
            className="flex-1 bg-void border border-white/10 px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60"
          />
          <button onClick={addMode} disabled={pending}
            className="flex items-center gap-1 bg-violet-electric/15 px-3 py-2 text-violet-electric ring-1 ring-violet-electric/30 hover:bg-violet-electric/25 transition disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </Section>

      {/* Annonces */}
      <Section icon={BellRing} title="Annonces & Actualités">
        {/* Créer */}
        <div className="space-y-3 border border-white/5 bg-void/50 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Nouvelle annonce</p>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Titre"
            className="w-full bg-transparent border border-white/10 px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60"
          />
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Contenu de l'annonce..."
            rows={3}
            className="w-full bg-transparent border border-white/10 px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60 resize-none"
          />
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-2">
              {NEWS_TYPES.map((t) => (
                <button key={t} onClick={() => setNewType(t)}
                  className={`px-3 py-1 font-mono text-[10px] uppercase tracking-widest ring-1 transition
                    ${newType === t ? `${NEWS_TYPE_META[t].bg} ${NEWS_TYPE_META[t].color} ${NEWS_TYPE_META[t].ring}` : "text-ivory/40 ring-white/10 hover:text-ivory"}`}>
                  {NEWS_TYPE_META[t].label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 font-mono text-xs text-ivory/50 cursor-pointer">
              <input type="checkbox" checked={newPopup} onChange={(e) => setNewPopup(e.target.checked)}
                className="accent-violet-electric" />
              Popup
            </label>
            <button onClick={handleCreateNews} disabled={pending || !newTitle.trim() || !newBody.trim()}
              className="ml-auto flex items-center gap-1.5 bg-violet-electric/15 px-4 py-2 font-mono text-xs text-violet-electric ring-1 ring-violet-electric/30 hover:bg-violet-electric/25 transition disabled:opacity-50">
              <Plus className="h-3.5 w-3.5" />
              Publier
            </button>
          </div>
        </div>

        {/* Liste */}
        <div className="space-y-2">
          {news.length === 0 ? (
            <p className="font-mono text-xs text-ivory/30 text-center py-4">Aucune annonce.</p>
          ) : news.map((n) => {
            const meta = NEWS_TYPE_META[n.type] ?? NEWS_TYPE_META.info
            return (
              <div key={n.id} className="flex items-start gap-3 border border-white/10 bg-surface/40 px-4 py-3">
                <span className={`mt-0.5 flex-shrink-0 font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 ring-1 ${meta.bg} ${meta.color} ${meta.ring}`}>
                  {meta.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-ivory truncate">{n.title}</p>
                  <p className="font-mono text-[11px] text-ivory/40 truncate">{n.body}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <label className="flex items-center gap-1.5 font-mono text-[10px] text-ivory/40 cursor-pointer">
                    <input type="checkbox" checked={n.active} onChange={(e) => handleToggleNews(n.id, "active", e.target.checked)}
                      className="accent-violet-electric" />
                    Actif
                  </label>
                  <label className="flex items-center gap-1.5 font-mono text-[10px] text-ivory/40 cursor-pointer">
                    <input type="checkbox" checked={n.popup} onChange={(e) => handleToggleNews(n.id, "popup", e.target.checked)}
                      className="accent-violet-electric" />
                    Popup
                  </label>
                  <button onClick={() => handleDeleteNews(n.id)}
                    className="text-ivory/20 hover:text-signal transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </Section>
    </div>
  )
}
