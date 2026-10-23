"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ExternalLink, Monitor, RotateCw, Smartphone, X } from "lucide-react"
import { onAdminChange } from "@/lib/admin-events"

type Device = "desktop" | "mobile"

const PREVIEW_URL = "/?apercu=admin"
const STORAGE_KEY = "brumeco-admin-preview"
// Largeur du panneau latéral (desktop ≥ 1024px) selon le cadre choisi
const PANEL_WIDTH: Record<Device, string> = {
  desktop: "min(55vw, 1000px)",
  mobile: "440px", // cadre 390px + marges
}

function EyeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const update = () => setDesktop(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return desktop
}

/** Bouton « Vue client » (œil) + panneau d'aperçu en direct de la vitrine. */
export function AdminClientPreview() {
  const [open, setOpen] = useState(false)
  const [device, setDevice] = useState<Device>("desktop")
  const [auto, setAuto] = useState(true)
  const [loading, setLoading] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [src, setSrc] = useState(PREVIEW_URL)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDesktop = useIsDesktop()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Préférences mémorisées (ouvert / cadre / auto)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")
      if (saved.device === "mobile" || saved.device === "desktop") setDevice(saved.device)
      if (typeof saved.auto === "boolean") setAuto(saved.auto)
      if (saved.open && window.matchMedia("(min-width: 1024px)").matches) setOpen(true)
    } catch { /* ignore */ }
  }, [])
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ open, device, auto })) } catch { /* ignore */ }
  }, [open, device, auto])

  const reload = useCallback(() => {
    setLoading(true)
    const win = frameRef.current?.contentWindow
    try {
      // Même origine : recharge en conservant la page et le défilement en cours
      if (win && win.location.href !== "about:blank") { win.location.reload(); return }
    } catch { /* inaccessible : on force via l'URL */ }
    setSrc(`${PREVIEW_URL}&_r=${Date.now()}`)
  }, [])

  // Temps réel : rechargement après chaque sauvegarde admin
  useEffect(() => {
    if (!open || !auto) return
    return onAdminChange(() => {
      if (debounce.current) clearTimeout(debounce.current)
      debounce.current = setTimeout(reload, 500)
    })
  }, [open, auto, reload])

  // Split view : réserve la place du panneau à droite du dashboard (desktop)
  useEffect(() => {
    const root = document.documentElement
    if (open && isDesktop) root.style.setProperty("--admin-preview-w", PANEL_WIDTH[device])
    else root.style.removeProperty("--admin-preview-w")
    return () => { root.style.removeProperty("--admin-preview-w") }
  }, [open, isDesktop, device])

  // Échap ferme ; scroll du dashboard bloqué en plein écran mobile
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    if (!isDesktop) document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, isDesktop])

  const btn = "grid h-9 w-9 place-items-center border border-white/10 text-ivory/60 transition hover:border-violet-electric/50 hover:text-violet-electric"
  const time = updatedAt?.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })

  return (
    <>
      <div className="group relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`relative flex items-center gap-1.5 transition hover:text-violet-electric ${open ? "text-violet-electric" : "text-ivory/70"}`}
          aria-label="Vue client"
          aria-pressed={open}
          title="Vue client"
        >
          <EyeIcon className="h-5 w-5" />
          {open && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-violet-electric shadow-[0_0_6px_#B355FF]" />}
        </button>
        <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap border border-white/10 bg-surface px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-ivory/70 opacity-0 transition group-hover:opacity-100">
          Vue client
        </span>
      </div>

      {/* Portail vers <body> : le header (backdrop-blur) piégerait le position:fixed */}
      {open && mounted && createPortal(
        <aside
          role="dialog"
          aria-label="Vue client — aperçu en direct de la boutique"
          className="fixed inset-0 z-[70] flex flex-col border-white/10 bg-void lg:inset-y-0 lg:left-auto lg:right-0 lg:z-[45] lg:border-l"
          style={isDesktop ? { width: PANEL_WIDTH[device] } : undefined}
        >
          {/* Barre d'outils */}
          <div className="flex items-center gap-2 border-b border-white/10 bg-surface/60 px-3 py-2.5">
            <EyeIcon className="h-4 w-4 shrink-0 text-violet-electric" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ivory/80">Vue client</p>
              <p className="truncate font-mono text-[9px] text-ivory/40">
                {loading ? "Chargement…" : time ? `Mis à jour à ${time}` : "Aperçu en direct"}
              </p>
            </div>

            <div className="hidden items-center border border-white/10 lg:flex" role="group" aria-label="Cadre">
              {([["desktop", Monitor, "Ordinateur"], ["mobile", Smartphone, "Mobile 390px"]] as const).map(([d, Icon, label]) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDevice(d)}
                  aria-pressed={device === d}
                  title={label}
                  aria-label={label}
                  className={`grid h-9 w-9 place-items-center transition ${device === d ? "bg-violet-electric/15 text-violet-electric" : "text-ivory/50 hover:text-ivory"}`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>

            <label className="flex cursor-pointer select-none items-center gap-1.5 px-1 font-mono text-[9px] uppercase tracking-widest text-ivory/50" title="Recharger automatiquement après chaque sauvegarde">
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-[#B355FF]" />
              Auto
            </label>
            <button type="button" onClick={reload} className={btn} title="Rafraîchir" aria-label="Rafraîchir l'aperçu">
              <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <a href={PREVIEW_URL} target="_blank" rel="noopener" className={btn} title="Ouvrir dans un nouvel onglet" aria-label="Ouvrir dans un nouvel onglet">
              <ExternalLink className="h-4 w-4" />
            </a>
            <button type="button" onClick={() => setOpen(false)} className={btn} title="Fermer" aria-label="Fermer la vue client">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Cadre */}
          <div className={`flex min-h-0 flex-1 justify-center overflow-auto ${isDesktop && device === "mobile" ? "bg-[radial-gradient(ellipse_at_center,rgba(179,85,255,0.08),transparent_70%)] p-4" : ""}`}>
            <iframe
              ref={frameRef}
              src={src}
              title="Vue client de la boutique"
              onLoad={() => { setLoading(false); setUpdatedAt(new Date()) }}
              className={`h-full bg-void ${isDesktop && device === "mobile" ? "w-[390px] shrink-0 border border-white/15 shadow-[0_0_40px_rgba(179,85,255,0.15)]" : "w-full"}`}
            />
          </div>
          <a href={PREVIEW_URL} target="_blank" rel="noopener" className="border-t border-white/10 px-3 py-2 text-center font-mono text-[9px] uppercase tracking-widest text-ivory/40 hover:text-violet-electric lg:hidden">
            Ouvrir dans un nouvel onglet
          </a>
        </aside>,
        document.body,
      )}
    </>
  )
}
