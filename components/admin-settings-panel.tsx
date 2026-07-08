"use client"

import { useState, useTransition } from "react"
import { Plus, Trash2, Save, Zap, BellRing, Clock, Store, Truck, Type } from "lucide-react"
import {
  setSetting,
  setCartConfig,
  createNews,
  updateNews,
  deleteNews,
  type NewsItem,
  type CartConfig,
} from "@/app/actions/settings"
import { broadcastPush } from "@/app/actions/push"
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
  cartConfig?: CartConfig
}

const DEFAULT_CONFIG: CartConfig = {
  minDeliveryAmount: 50,
  deliverySlots: [
    { id: "d1", label: "14H - 17H", startHour: 14, endHour: 17 },
    { id: "d2", label: "18H - 20H", startHour: 18, endHour: 20 },
    { id: "d3", label: "21H - 02H", startHour: 21, endHour: 2  },
  ],
  meetupSlots: [
    { id: "m14", label: "14H", hour: 14 },
    { id: "m18", label: "18H", hour: 18 },
    { id: "m22", label: "22H", hour: 22 },
  ],
}

export function AdminSettingsPanel({ settings, news: initialNews, cartConfig: initialConfig }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [logisticsFb, setLogisticsFb] = useState<string | null>(null)
  const [config, setConfig] = useState<CartConfig>(initialConfig ?? DEFAULT_CONFIG)
  const [pushTitle, setPushTitle] = useState("")
  const [pushBody, setPushBody]   = useState("")
  const [pushFb, setPushFb]       = useState<string | null>(null)

  // Textes du site
  const [heroEyebrow,    setHeroEyebrow]    = useState<string>(settings.hero_eyebrow    ?? "Édition Capsule — Automne")
  const [heroBody,       setHeroBody]       = useState<string>(settings.hero_body       ?? "Coupes larges, matières lourdes, silhouette orage. Le streetwear pensé pour la rue, la nuit, et ce qui gronde au-dessus.")
  const [heroCtaLabel,   setHeroCtaLabel]   = useState<string>(settings.hero_cta_label  ?? "Voir la collection")
  const [footerTagline,  setFooterTagline]  = useState<string>(settings.footer_tagline  ?? "Que de la foudre la famille.")
  const [footerCopyright,setFooterCopyright]= useState<string>(settings.footer_copyright ?? `© ${new Date().getFullYear()} HEISENWEB — Tous droits réservés`)
  const [siteName,            setSiteName]            = useState<string>(settings.site_name             ?? "FULLTERPS33")
  const [navLabelCapsule,     setNavLabelCapsule]     = useState<string>(settings.nav_label_capsule      ?? "Édition Capsule")
  const [navLabelNouveautes,  setNavLabelNouveautes]  = useState<string>(settings.nav_label_nouveautes   ?? "Nouveautés")
  const [secCapsuleEyebrow,   setSecCapsuleEyebrow]   = useState<string>(settings.section_capsule_eyebrow  ?? "En vedette")
  const [secCapsuleTitle,     setSecCapsuleTitle]     = useState<string>(settings.section_capsule_title    ?? "Édition Capsule")
  const [secNouveautesEyebrow,setSecNouveautesEyebrow]= useState<string>(settings.section_nouveautes_eyebrow ?? "Fraîchement débarqué")
  const [secNouveautesTitle,  setSecNouveautesTitle]  = useState<string>(settings.section_nouveautes_title   ?? "Nouveautés")
  const [siteTextsFb,         setSiteTextsFb]         = useState<string | null>(null)

  function saveSiteTexts() {
    startTransition(async () => {
      await Promise.all([
        setSetting("hero_eyebrow",                heroEyebrow),
        setSetting("hero_body",                   heroBody),
        setSetting("hero_cta_label",              heroCtaLabel),
        setSetting("footer_tagline",              footerTagline),
        setSetting("footer_copyright",            footerCopyright),
        setSetting("site_name",                   siteName),
        setSetting("nav_label_capsule",           navLabelCapsule),
        setSetting("nav_label_nouveautes",        navLabelNouveautes),
        setSetting("section_capsule_eyebrow",     secCapsuleEyebrow),
        setSetting("section_capsule_title",       secCapsuleTitle),
        setSetting("section_nouveautes_eyebrow",  secNouveautesEyebrow),
        setSetting("section_nouveautes_title",    secNouveautesTitle),
      ])
      setSiteTextsFb("Textes sauvegardés")
      setTimeout(() => setSiteTextsFb(null), 2500)
      router.refresh()
    })
  }

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

  // ── Logistique ─────────────────────────────────────────────────────────────
  function saveCartConfig() {
    startTransition(async () => {
      await setCartConfig(config)
      setLogisticsFb("Configuration sauvegardée")
      setTimeout(() => setLogisticsFb(null), 2500)
    })
  }

  function updateDeliverySlot(idx: number, field: string, raw: string) {
    setConfig(c => ({
      ...c,
      deliverySlots: c.deliverySlots.map((s, i) =>
        i === idx ? { ...s, [field]: field === "label" ? raw : Number(raw) } : s
      ),
    }))
  }

  function removeDeliverySlot(idx: number) {
    setConfig(c => ({ ...c, deliverySlots: c.deliverySlots.filter((_, i) => i !== idx) }))
  }

  function addDeliverySlot() {
    setConfig(c => ({
      ...c,
      deliverySlots: [...c.deliverySlots, { id: `d${Date.now()}`, label: "Nouveau", startHour: 18, endHour: 20 }],
    }))
  }

  function updateMeetupSlot(idx: number, field: string, raw: string) {
    setConfig(c => ({
      ...c,
      meetupSlots: c.meetupSlots.map((s, i) =>
        i === idx ? { ...s, [field]: field === "label" ? raw : Number(raw) } : s
      ),
    }))
  }

  function removeMeetupSlot(idx: number) {
    setConfig(c => ({ ...c, meetupSlots: c.meetupSlots.filter((_, i) => i !== idx) }))
  }

  function addMeetupSlot() {
    setConfig(c => ({
      ...c,
      meetupSlots: [...c.meetupSlots, { id: `m${Date.now()}`, label: "00H", hour: 0 }],
    }))
  }

  // ── Push broadcast ─────────────────────────────────────────────────────────
  function sendBroadcast() {
    if (!pushTitle.trim()) return
    startTransition(async () => {
      const r = await broadcastPush(pushTitle, pushBody)
      setPushFb(r.ok ? `Envoyé à ${r.sent} abonné(s)` : "Erreur envoi")
      setPushTitle(""); setPushBody("")
      setTimeout(() => setPushFb(null), 3000)
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

      {/* Textes du site */}
      <Section icon={Type} title="Textes du site">
        {siteTextsFb && <p className="font-mono text-xs text-violet-electric">{siteTextsFb}</p>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Nom du site</label>
            <input value={siteName} onChange={e => setSiteName(e.target.value)}
              className="w-full bg-void border border-white/10 px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60" />
          </div>
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Hero — Accroche</label>
            <input value={heroEyebrow} onChange={e => setHeroEyebrow(e.target.value)}
              className="w-full bg-void border border-white/10 px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Hero — Description</label>
            <textarea value={heroBody} onChange={e => setHeroBody(e.target.value)} rows={3}
              className="w-full resize-none bg-void border border-white/10 px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60" />
          </div>
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Hero — Bouton principal</label>
            <input value={heroCtaLabel} onChange={e => setHeroCtaLabel(e.target.value)}
              className="w-full bg-void border border-white/10 px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60" />
          </div>
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Footer — Slogan</label>
            <input value={footerTagline} onChange={e => setFooterTagline(e.target.value)}
              className="w-full bg-void border border-white/10 px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Footer — Copyright</label>
            <input value={footerCopyright} onChange={e => setFooterCopyright(e.target.value)}
              className="w-full bg-void border border-white/10 px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60" />
          </div>
        </div>

        {/* Navigation */}
        <p className="font-mono text-[10px] uppercase tracking-widest text-ivory/30 pt-2">Liens de navigation</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Lien Capsule</label>
            <input value={navLabelCapsule} onChange={e => setNavLabelCapsule(e.target.value)}
              className="w-full bg-void border border-white/10 px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60" />
          </div>
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Lien Nouveautés</label>
            <input value={navLabelNouveautes} onChange={e => setNavLabelNouveautes(e.target.value)}
              className="w-full bg-void border border-white/10 px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60" />
          </div>
        </div>

        {/* Sections page d'accueil */}
        <p className="font-mono text-[10px] uppercase tracking-widest text-ivory/30 pt-2">Sections page d&apos;accueil</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Section Capsule — Sous-titre</label>
            <input value={secCapsuleEyebrow} onChange={e => setSecCapsuleEyebrow(e.target.value)}
              className="w-full bg-void border border-white/10 px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60" />
          </div>
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Section Capsule — Titre</label>
            <input value={secCapsuleTitle} onChange={e => setSecCapsuleTitle(e.target.value)}
              className="w-full bg-void border border-white/10 px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60" />
          </div>
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Section Nouveautés — Sous-titre</label>
            <input value={secNouveautesEyebrow} onChange={e => setSecNouveautesEyebrow(e.target.value)}
              className="w-full bg-void border border-white/10 px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60" />
          </div>
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Section Nouveautés — Titre</label>
            <input value={secNouveautesTitle} onChange={e => setSecNouveautesTitle(e.target.value)}
              className="w-full bg-void border border-white/10 px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60" />
          </div>
        </div>

        <button onClick={saveSiteTexts} disabled={pending}
          className="flex items-center gap-1.5 bg-violet-electric/15 px-4 py-2 font-mono text-xs text-violet-electric ring-1 ring-violet-electric/30 hover:bg-violet-electric/25 transition disabled:opacity-50">
          <Save className="h-3.5 w-3.5" /> Sauvegarder les textes
        </button>
      </Section>

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

      {/* Logistique cartConfig */}
      <Section icon={Truck} title="Logistique — créneaux & montant min">
        {logisticsFb && (
          <p className="font-mono text-xs text-violet-electric">{logisticsFb}</p>
        )}
        {/* Montant minimum */}
        <div className="flex items-center gap-3">
          <label className="font-mono text-[10px] uppercase tracking-widest text-ivory/40 w-40">Montant min livraison</label>
          <input
            type="number" min={0}
            value={config.minDeliveryAmount}
            onChange={e => setConfig(c => ({ ...c, minDeliveryAmount: Number(e.target.value) }))}
            className="w-24 bg-void border border-white/10 px-3 py-1.5 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60"
          />
          <span className="font-mono text-xs text-ivory/40">€</span>
        </div>
        {/* Créneaux livraison */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Créneaux livraison</p>
            <button onClick={addDeliverySlot} className="flex items-center gap-1 font-mono text-[10px] text-violet-electric hover:underline">
              <Plus className="h-3 w-3" /> Ajouter
            </button>
          </div>
          {config.deliverySlots.map((slot, idx) => (
            <div key={slot.id} className="flex flex-wrap items-center gap-2">
              <input value={slot.label} onChange={e => updateDeliverySlot(idx, "label", e.target.value)}
                className="flex-1 min-w-[100px] bg-void border border-white/10 px-2 py-1 font-mono text-xs text-ivory outline-none focus:border-violet-electric/60" />
              <input type="number" min={0} max={23} value={slot.startHour} onChange={e => updateDeliverySlot(idx, "startHour", e.target.value)}
                className="w-14 bg-void border border-white/10 px-2 py-1 font-mono text-xs text-ivory outline-none" />
              <span className="font-mono text-[10px] text-ivory/30">→</span>
              <input type="number" min={0} max={23} value={slot.endHour} onChange={e => updateDeliverySlot(idx, "endHour", e.target.value)}
                className="w-14 bg-void border border-white/10 px-2 py-1 font-mono text-xs text-ivory outline-none" />
              <button onClick={() => removeDeliverySlot(idx)} className="text-ivory/30 hover:text-signal transition"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
        {/* Créneaux meet-up */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Créneaux meet-up</p>
            <button onClick={addMeetupSlot} className="flex items-center gap-1 font-mono text-[10px] text-violet-electric hover:underline">
              <Plus className="h-3 w-3" /> Ajouter
            </button>
          </div>
          {config.meetupSlots.map((slot, idx) => (
            <div key={slot.id} className="flex flex-wrap items-center gap-2">
              <input value={slot.label} onChange={e => updateMeetupSlot(idx, "label", e.target.value)}
                className="flex-1 min-w-[80px] bg-void border border-white/10 px-2 py-1 font-mono text-xs text-ivory outline-none focus:border-violet-electric/60" />
              <input type="number" min={0} max={23} value={slot.hour} onChange={e => updateMeetupSlot(idx, "hour", e.target.value)}
                className="w-14 bg-void border border-white/10 px-2 py-1 font-mono text-xs text-ivory outline-none" />
              <span className="font-mono text-[10px] text-ivory/40">h</span>
              <button onClick={() => removeMeetupSlot(idx)} className="text-ivory/30 hover:text-signal transition"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
        <button onClick={saveCartConfig} disabled={pending}
          className="flex items-center gap-1.5 bg-violet-electric/15 px-4 py-2 font-mono text-xs text-violet-electric ring-1 ring-violet-electric/30 hover:bg-violet-electric/25 transition disabled:opacity-50">
          <Save className="h-3.5 w-3.5" /> Sauvegarder logistique
        </button>
      </Section>

      {/* Push broadcast */}
      <Section icon={BellRing} title="Notification push globale">
        {pushFb && <p className="font-mono text-xs text-violet-electric">{pushFb}</p>}
        <input value={pushTitle} onChange={e => setPushTitle(e.target.value)} placeholder="Titre de la notification"
          className="w-full bg-void border border-white/10 px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60" />
        <textarea value={pushBody} onChange={e => setPushBody(e.target.value)} placeholder="Corps du message" rows={2}
          className="w-full bg-void border border-white/10 px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60 resize-none" />
        <button onClick={sendBroadcast} disabled={pending || !pushTitle.trim()}
          className="flex items-center gap-1.5 bg-violet-electric/15 px-4 py-2 font-mono text-xs text-violet-electric ring-1 ring-violet-electric/30 hover:bg-violet-electric/25 transition disabled:opacity-50">
          <Zap className="h-3.5 w-3.5" /> Envoyer à tous les abonnés
        </button>
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
