"use client"

import { useEffect, useState, useTransition } from "react"
import { Plus, Trash2, Save, Zap, BellRing, Clock, Store, Truck, Type } from "lucide-react"
import {
  setSetting,
  setCartConfig,
  saveSiteTextsAction,
  createNews,
  updateNews,
  deleteNews,
  type NewsItem,
  type CartConfig,
  type ShopSection,
} from "@/app/actions/settings"
import { broadcastPush } from "@/app/actions/push"
import { useRouter } from "next/navigation"
import { BRAND_NAME, FOOTER_TAGLINE, HERO_BODY, HERO_CTA, HERO_EYEBROW, findForbiddenTerm, publicText } from "@/lib/brand"
import { notifyAdminChange } from "@/lib/admin-events"

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
  /** Sections de la page d'accueil (source réelle des titres affichés en vitrine). */
  sections?: ShopSection[]
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

// Défini au niveau du module (et non dans le rendu du panneau) : un composant
// recréé à chaque rendu change d'identité, React démonte/remonte alors tout son
// contenu à chaque frappe et le champ en cours d'édition perd le focus.
function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="border border-white/10 bg-surface/40 p-5 space-y-4">
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <Icon className="h-4 w-4 text-violet-electric" />
        <h3 className="font-mono text-xs uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </div>
  )
}

const COPYRIGHT_DEFAULT = `© ${new Date().getFullYear()} ${BRAND_NAME} — Tous droits réservés`

/** Valeur brute enregistrée (sans le filtre de marque), pour que l'admin voie ce qui est réellement en base. */
function rawText(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback
}

/**
 * Champ texte + aperçu de ce que la vitrine affichera réellement. lib/brand.ts
 * (publicText) remplace les textes vides ou contenant un terme explicite lié aux
 * stupéfiants par un texte par défaut : on le signale ici au lieu de laisser croire que la
 * sauvegarde n'a pas marché.
 */
function TextField({ label, value, onChange, fallback, multiline = false, wide = false }: {
  label: string; value: string; onChange: (v: string) => void; fallback: string; multiline?: boolean; wide?: boolean
}) {
  const shown = publicText(value, fallback)
  const replaced = shown !== value.trim()
  const term = findForbiddenTerm(value)
  const cls = "w-full bg-void border px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric/60 " +
    (replaced ? "border-signal/50" : "border-white/10")
  return (
    <div className={`space-y-1 ${wide ? "sm:col-span-2" : ""}`}>
      <label className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">{label}</label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className={cls + " resize-none"} />
        : <input value={value} onChange={e => onChange(e.target.value)} className={cls} />}
      {replaced && (
        <p className="font-mono text-[10px] leading-relaxed text-signal" data-replaced-note>
          {value.trim()
            ? <>Terme non autorisé : « {term ?? value.trim()} ». Les visiteurs verront « {shown} » à la place (l&apos;aperçu admin montre le texte enregistré).</>
            : <>Champ vide : l&apos;aperçu et les visiteurs affichent « {shown} ».</>}
        </p>
      )}
    </div>
  )
}

function errMsg(err: unknown) {
  return err instanceof Error && err.message ? err.message : "erreur serveur"
}

export function AdminSettingsPanel({ settings, news: initialNews, cartConfig: initialConfig, sections = [] }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [logisticsFb, setLogisticsFb] = useState<string | null>(null)
  const [config, setConfig] = useState<CartConfig>(initialConfig ?? DEFAULT_CONFIG)
  const [pushTitle, setPushTitle] = useState("")
  const [pushBody, setPushBody]   = useState("")
  const [pushFb, setPushFb]       = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Textes du site
  // Valeurs brutes enregistrées (et non filtrées) : voir TextField pour l'aperçu vitrine.
  const [heroEyebrow,    setHeroEyebrow]    = useState<string>(rawText(settings.hero_eyebrow, HERO_EYEBROW))
  const [heroBody,       setHeroBody]       = useState<string>(rawText(settings.hero_body, HERO_BODY))
  const [heroCtaLabel,   setHeroCtaLabel]   = useState<string>(rawText(settings.hero_cta_label, HERO_CTA))
  const [footerTagline,  setFooterTagline]  = useState<string>(rawText(settings.footer_tagline, FOOTER_TAGLINE))
  const [footerCopyright,setFooterCopyright]= useState<string>(rawText(settings.footer_copyright, COPYRIGHT_DEFAULT))
  const [siteName,            setSiteName]            = useState<string>(rawText(settings.site_name, BRAND_NAME))
  const [navLabelCapsule,     setNavLabelCapsule]     = useState<string>(rawText(settings.nav_label_capsule, "Les classiques"))
  const [navLabelNouveautes,  setNavLabelNouveautes]  = useState<string>(rawText(settings.nav_label_nouveautes, "Nouveautés"))
  // Les titres de sections affichés en vitrine viennent de `shop_sections`
  // (onglet Sections) : on part de la valeur brute en base.
  const rawSections: ShopSection[] = Array.isArray(settings.shop_sections) && settings.shop_sections.length > 0 ? settings.shop_sections : sections
  const secVedette    = rawSections.find((s) => s.slug === "vedette")
  const secNouveautes = rawSections.find((s) => s.slug === "nouveautes")
  const [secCapsuleEyebrow,   setSecCapsuleEyebrow]   = useState<string>(rawText(secVedette?.eyebrow,    "En vedette"))
  const [secCapsuleTitle,     setSecCapsuleTitle]     = useState<string>(rawText(secVedette?.title,      "Les classiques"))
  const [secNouveautesEyebrow,setSecNouveautesEyebrow]= useState<string>(rawText(secNouveautes?.eyebrow, "Arrivages"))
  const [secNouveautesTitle,  setSecNouveautesTitle]  = useState<string>(rawText(secNouveautes?.title,   "Nouveautés"))
  const [siteTextsFb,         setSiteTextsFb]         = useState<string | null>(null)

  function saveSiteTexts() {
    const texts: [string, string, string][] = [
      ["Nom du site", siteName, BRAND_NAME], ["Hero — Accroche", heroEyebrow, HERO_EYEBROW], ["Hero — Description", heroBody, HERO_BODY],
      ["Hero — Bouton principal", heroCtaLabel, HERO_CTA], ["Footer — Slogan", footerTagline, FOOTER_TAGLINE], ["Footer — Copyright", footerCopyright, COPYRIGHT_DEFAULT],
      ["Lien Capsule", navLabelCapsule, "Les classiques"], ["Lien Nouveautés", navLabelNouveautes, "Nouveautés"],
      ["Section Capsule — Sous-titre", secCapsuleEyebrow, "En vedette"], ["Section Capsule — Titre", secCapsuleTitle, "Les classiques"],
      ["Section Nouveautés — Sous-titre", secNouveautesEyebrow, "En vedette"], ["Section Nouveautés — Titre", secNouveautesTitle, "Les classiques"],
    ]
    // Textes que la vitrine remplacera (terme non autorisé ou champ vide).
    const replaced = texts.filter(([, v, fb]) => publicText(v, fb) !== v.trim()).map(([l]) => l)
    setSiteTextsFb("Sauvegarde en cours…")
    startTransition(async () => {
      try {
        const res = await saveSiteTextsAction(
          {
            site_name: siteName, hero_eyebrow: heroEyebrow, hero_body: heroBody, hero_cta_label: heroCtaLabel,
            footer_tagline: footerTagline, footer_copyright: footerCopyright,
            nav_label_capsule: navLabelCapsule, nav_label_nouveautes: navLabelNouveautes,
            section_capsule_eyebrow: secCapsuleEyebrow, section_capsule_title: secCapsuleTitle,
            section_nouveautes_eyebrow: secNouveautesEyebrow, section_nouveautes_title: secNouveautesTitle,
          },
          [
            { slug: "vedette",    eyebrow: secCapsuleEyebrow,    title: secCapsuleTitle },
            { slug: "nouveautes", eyebrow: secNouveautesEyebrow, title: secNouveautesTitle },
          ],
        )
        if (!res.ok) { setSiteTextsFb(`Échec de la sauvegarde : ${res.error ?? "erreur serveur"}`); return }
        const missing = res.missing ?? []
        notifyAdminChange("settings")
        setSiteTextsFb(
          "Textes enregistrés" +
          (missing.length ? ` — section(s) introuvable(s) : ${missing.join(", ")} (voir onglet Sections)` : "") +
          (replaced.length
            ? `. Remplacé(s) par le texte par défaut pour les visiteurs (terme non autorisé ou champ vide) : ${replaced.join(", ")}.`
            : ". Ils sont visibles en vitrine."),
        )
        setTimeout(() => setSiteTextsFb(null), replaced.length || missing.length ? 10000 : 3000)
        router.refresh()
      } catch (err) {
        setSiteTextsFb(`Échec de la sauvegarde : ${errMsg(err)}`)
      }
    })
  }

  // Boutique
  const [shopOpen, setShopOpen]       = useState<boolean>(settings.shop_open ?? true)
  const [shopMsg, setShopMsg]         = useState<string>(publicText(settings.shop_message, ""))

  // Créneaux livraison
  const [slots, setSlots] = useState<string[]>(settings.delivery_slots ?? [])
  const [newSlot, setNewSlot] = useState("")

  // Modes livraison
  const [modes, setModes] = useState<string[]>(
    ((settings.delivery_modes as string[] | undefined) ?? ["Livraison", "Retrait boutique"]).map((m) =>
      /meet-?up/i.test(m) ? "Retrait boutique" : m,
    ),
  )
  const [newMode, setNewMode] = useState("")

  // News
  const [news, setNews] = useState<NewsItem[]>(initialNews)
  const [newTitle, setNewTitle] = useState("")
  const [newBody, setNewBody]   = useState("")
  const [newType, setNewType]   = useState<NewsItem["type"]>("info")
  const [newPopup, setNewPopup] = useState(false)

  function save(key: string, value: any) {
    startTransition(async () => {
      try {
        await setSetting(key, value)
        setSaveError(null)
        notifyAdminChange("settings")
        router.refresh()
      } catch (err) {
        setSaveError(`Échec de la sauvegarde (${key}) : ${errMsg(err)}`)
      }
    })
  }

  // Après router.refresh(), les nouvelles annonces arrivent par les props :
  // on resynchronise la liste locale (sinon une annonce publiée n'apparaît
  // qu'après un rechargement complet).
  useEffect(() => { setNews(initialNews) }, [initialNews])

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
      notifyAdminChange("news")
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
      notifyAdminChange("news")
    })
  }

  function handleDeleteNews(id: number) {
    setNews((prev) => prev.filter((n) => n.id !== id))
    startTransition(async () => {
      await deleteNews(id)
      notifyAdminChange("news")
    })
  }

  // ── Logistique ─────────────────────────────────────────────────────────────
  function saveCartConfig() {
    startTransition(async () => {
      try {
        await setCartConfig(config)
        notifyAdminChange("cart")
        setLogisticsFb("Configuration sauvegardée")
        setTimeout(() => setLogisticsFb(null), 2500)
        router.refresh()
      } catch (err) {
        setLogisticsFb(`Échec de la sauvegarde : ${errMsg(err)}`)
      }
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

  return (
    <div className="space-y-6">
      {saveError && (
        <p role="alert" className="border border-signal/40 bg-signal/10 px-3 py-2 font-mono text-xs text-signal">{saveError}</p>
      )}

      {/* Textes du site */}
      <Section icon={Type} title="Textes du site">
        {siteTextsFb && <p className="font-mono text-xs text-violet-electric">{siteTextsFb}</p>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Nom du site" value={siteName} onChange={setSiteName} fallback={BRAND_NAME} />
          <TextField label="Hero — Accroche" value={heroEyebrow} onChange={setHeroEyebrow} fallback={HERO_EYEBROW} />
          <TextField label="Hero — Description" value={heroBody} onChange={setHeroBody} fallback={HERO_BODY} multiline wide />
          <TextField label="Hero — Bouton principal" value={heroCtaLabel} onChange={setHeroCtaLabel} fallback={HERO_CTA} />
          <TextField label="Footer — Slogan" value={footerTagline} onChange={setFooterTagline} fallback={FOOTER_TAGLINE} />
          <TextField label="Footer — Copyright" value={footerCopyright} onChange={setFooterCopyright} fallback={COPYRIGHT_DEFAULT} wide />
        </div>

        {/* Navigation */}
        <p className="font-mono text-[10px] uppercase tracking-widest text-ivory/30 pt-2">Liens de navigation (menu, bouton « Nouveautés » du hero, liens du footer)</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Lien Capsule" value={navLabelCapsule} onChange={setNavLabelCapsule} fallback="Les classiques" />
          <TextField label="Lien Nouveautés" value={navLabelNouveautes} onChange={setNavLabelNouveautes} fallback="Nouveautés" />
        </div>

        {/* Sections page d'accueil */}
        <p className="font-mono text-[10px] uppercase tracking-widest text-ivory/30 pt-2">Sections page d&apos;accueil (identiques à l&apos;onglet Sections)</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Section Capsule — Sous-titre" value={secCapsuleEyebrow} onChange={setSecCapsuleEyebrow} fallback="En vedette" />
          <TextField label="Section Capsule — Titre" value={secCapsuleTitle} onChange={setSecCapsuleTitle} fallback="Les classiques" />
          <TextField label="Section Nouveautés — Sous-titre" value={secNouveautesEyebrow} onChange={setSecNouveautesEyebrow} fallback="En vedette" />
          <TextField label="Section Nouveautés — Titre" value={secNouveautesTitle} onChange={setSecNouveautesTitle} fallback="Les classiques" />
        </div>

        <button onClick={saveSiteTexts} disabled={pending}
          className="flex items-center gap-1.5 bg-violet-electric/15 px-4 py-2 font-mono text-xs text-violet-electric ring-1 ring-violet-electric/30 hover:bg-violet-electric/25 transition disabled:opacity-50">
          <Save className="h-3.5 w-3.5" /> Sauvegarder les textes
        </button>
        {/* Retour aussi sous le bouton : sur mobile le haut du bloc est hors écran. */}
        {siteTextsFb && <p role="status" className="font-mono text-xs text-violet-electric">{siteTextsFb}</p>}
      </Section>

      {/* Statut boutique */}
      <Section icon={Store} title="Statut boutique">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-ivory/70">Boutique ouverte <span className="text-ivory/40">(fermée : bandeau en haut de la boutique)</span></span>
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
        <p className="font-mono text-[10px] leading-relaxed text-ivory/40">
          Ancien réglage, non utilisé par le panier. Les créneaux et modes proposés aux clients se règlent dans « Logistique — créneaux &amp; montant min ».
        </p>
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
        {/* Créneaux de retrait */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Créneaux de retrait</p>
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
        <p className="font-mono text-[10px] leading-relaxed text-ivory/40">
          Ancien réglage, non utilisé par le panier. Les créneaux et modes proposés aux clients se règlent dans « Logistique — créneaux &amp; montant min ».
        </p>
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
            placeholder="Ex: Retrait boutique"
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
