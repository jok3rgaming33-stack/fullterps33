"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { OrderThread } from "@/app/actions/messaging"
import { pointsForAmount } from "@/lib/loyalty"
import { isClosedStatus } from "@/lib/order-status"
import { getMapOrigin, setMapOrigin } from "@/app/actions/settings"
import {
  Map as MapIcon, MapPinOff, Route, RotateCcw,
  Truck, Store, Loader2, Clock, Save, Check,
} from "lucide-react"
import "leaflet/dist/leaflet.css"

const DEFAULT_ORIGIN = { lat: 44.841575, lng: -0.581069 }
const OSRM_BASE = "https://router.project-osrm.org"

type Located = OrderThread & { lat: number; lng: number }
type LatLng  = { lat: number; lng: number }
type Routing = {
  ordered: Located[]
  geometry: [number, number][]
  distanceKm: number
  durationMin: number
  legKm: Record<number, number>
  mode: "road" | "approx"
}

function escapeHtml(v: string) {
  return v.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")
}

function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

function dayDiff(scheduledDate?: string | null): number | null {
  if (!scheduledDate) return null
  const parts = scheduledDate.split("-").map(Number)
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null
  const [y, m, d] = parts
  const target = new Date(y, m - 1, d)
  target.setHours(0,0,0,0)
  const today = new Date(); today.setHours(0,0,0,0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function urgency(diff: number | null) {
  if (diff === null) return { color: "#9ca3af", label: "Sans date",      short: "—"   }
  if (diff <= 0)    return { color: "#ef4444", label: "Aujourd'hui",    short: "J"   }
  if (diff === 1)   return { color: "#f97316", label: "Demain (J+1)",   short: "J+1" }
  if (diff === 2)   return { color: "#eab308", label: "Dans 2 j (J+2)", short: "J+2" }
  return { color: "#22c55e", label: `Dans ${diff} j (J+${diff})`, short: `J+${diff}` }
}

function greedyOrder(start: LatLng, points: Located[]): Located[] {
  const remaining = [...points]; const ordered: Located[] = []
  let current = { lat: start.lat, lng: start.lng }
  while (remaining.length) {
    let bestIdx = 0; let bestDist = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineKm(current, { lat: remaining[i].lat, lng: remaining[i].lng })
      if (dist < bestDist) { bestDist = dist; bestIdx = i }
    }
    const [next] = remaining.splice(bestIdx, 1)
    ordered.push(next); current = { lat: next.lat, lng: next.lng }
  }
  return ordered
}

function buildApproxRouting(start: LatLng, points: Located[]): Routing {
  const ordered = greedyOrder(start, points)
  const geometry: [number, number][] = [[start.lat, start.lng], ...ordered.map((t) => [t.lat, t.lng] as [number, number])]
  const legKm: Record<number, number> = {}
  let prev: LatLng = start; let distanceKm = 0
  for (const t of ordered) {
    const d = haversineKm(prev, { lat: t.lat, lng: t.lng })
    legKm[t.id] = d; distanceKm += d; prev = { lat: t.lat, lng: t.lng }
  }
  return { ordered, geometry, distanceKm, durationMin: 0, legKm, mode: "approx" }
}

async function fetchOptimizedTrip(start: LatLng, points: Located[], signal: AbortSignal): Promise<Routing | null> {
  const coords = [start, ...points.map((p) => ({ lat: p.lat, lng: p.lng }))]
  const coordStr = coords.map((c) => `${c.lng},${c.lat}`).join(";")
  const url = `${OSRM_BASE}/trip/v1/driving/${coordStr}?source=first&roundtrip=false&geometries=geojson&overview=full`
  const res = await fetch(url, { signal }); if (!res.ok) return null
  const data = await res.json()
  if (data.code !== "Ok" || !data.trips?.[0] || !Array.isArray(data.waypoints)) return null
  const trip = data.trips[0]
  const waypoints = data.waypoints as Array<{ waypoint_index: number }>
  const withIndex = points.map((p, i) => ({ p, wp: waypoints[i + 1]?.waypoint_index ?? i + 1 }))
  withIndex.sort((a, b) => a.wp - b.wp)
  const ordered = withIndex.map((x) => x.p)
  const legs = (trip.legs ?? []) as Array<{ distance: number }>
  const legKm: Record<number, number> = {}
  ordered.forEach((t, idx) => { const leg = legs[idx]; if (leg) legKm[t.id] = leg.distance / 1000 })
  const geometry: [number, number][] = (trip.geometry?.coordinates ?? []).map(
    ([lng, lat]: [number, number]) => [lat, lng] as [number, number],
  )
  return {
    ordered, geometry: geometry.length ? geometry : [[start.lat, start.lng], ...ordered.map((t) => [t.lat, t.lng] as [number, number])],
    distanceKm: (trip.distance ?? 0) / 1000,
    durationMin: (trip.duration ?? 0) / 60,
    legKm, mode: "road",
  }
}

export function AdminMap({ threads }: { threads: OrderThread[] }) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<import("leaflet").Map | null>(null)
  const LRef          = useRef<typeof import("leaflet") | null>(null)
  const overlayRef    = useRef<import("leaflet").LayerGroup | null>(null)
  const [ready, setReady] = useState(false)

  const [departure, setDeparture] = useState(DEFAULT_ORIGIN)
  const [savingOrigin, setSavingOrigin] = useState(false)
  const [savedOrigin,  setSavedOrigin]  = useState(false)

  useEffect(() => {
    let cancelled = false
    getMapOrigin().then((o) => {
      if (!cancelled && Number.isFinite(o.lat) && Number.isFinite(o.lng)) setDeparture({ lat: o.lat, lng: o.lng })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const saveOrigin = async () => {
    setSavingOrigin(true); setSavedOrigin(false)
    const res = await setMapOrigin({ lat: departure.lat, lng: departure.lng })
    setSavingOrigin(false)
    if (res.ok) { setSavedOrigin(true); setTimeout(() => setSavedOrigin(false), 2000) }
  }

  const located = useMemo<Located[]>(
    () => threads.filter((t): t is Located => typeof t.lat === "number" && typeof t.lng === "number" && !isClosedStatus(t.status)),
    [threads],
  )

  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())
  const initRef = useRef(false)
  useEffect(() => {
    if (initRef.current || located.length === 0) return
    initRef.current = true
    setSelectedIds(new Set(located.map((t) => t.id)))
  }, [located])

  const orderCountByClient = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of threads) {
      const key = t.userToken || t.customerName || ""
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [threads])

  const selectedLocated = useMemo(() => located.filter((t) => selectedIds.has(t.id)), [located, selectedIds])

  const [routing, setRouting] = useState<Routing>({ ordered: [], geometry: [], distanceKm: 0, durationMin: 0, legKm: {}, mode: "road" })
  const [routeLoading, setRouteLoading] = useState(false)

  const routeKey = useMemo(
    () => `${departure.lat.toFixed(5)},${departure.lng.toFixed(5)}|${selectedLocated.map((t) => t.id).join(",")}`,
    [departure, selectedLocated],
  )

  useEffect(() => {
    if (selectedLocated.length === 0) {
      setRouting({ ordered: [], geometry: [], distanceKm: 0, durationMin: 0, legKm: {}, mode: "road" })
      setRouteLoading(false); return
    }
    const controller = new AbortController(); setRouteLoading(true)
    const timer = setTimeout(async () => {
      try {
        const trip = await fetchOptimizedTrip(departure, selectedLocated, controller.signal)
        if (controller.signal.aborted) return
        setRouting(trip ?? buildApproxRouting(departure, selectedLocated))
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return
        setRouting(buildApproxRouting(departure, selectedLocated))
      } finally { if (!controller.signal.aborted) setRouteLoading(false) }
    }, 350)
    return () => { controller.abort(); clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey])

  const route = routing.ordered
  const orderIndex = useMemo(() => {
    const map = new Map<number, number>()
    route.forEach((t, i) => map.set(t.id, i + 1))
    return map
  }, [route])

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next
    })
  }

  // Init carte
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default
      if (cancelled || !containerRef.current || mapRef.current) return
      LRef.current = L
      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([DEFAULT_ORIGIN.lat, DEFAULT_ORIGIN.lng], 12)
      mapRef.current = map
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap", maxZoom: 19 }).addTo(map)
      overlayRef.current = L.layerGroup().addTo(map)
      map.on("click", (e: import("leaflet").LeafletMouseEvent) => setDeparture({ lat: e.latlng.lat, lng: e.latlng.lng }))
      setReady(true); setTimeout(() => map.invalidateSize(), 100)
    })()
    return () => {
      cancelled = true
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; overlayRef.current = null; LRef.current = null; setReady(false) }
    }
  }, [])

  // Dessin marqueurs + itinéraire
  useEffect(() => {
    const L = LRef.current; const map = mapRef.current; const overlay = overlayRef.current
    if (!ready || !L || !map || !overlay) return
    overlay.clearLayers()

    // Point de départ
    const departureMarker = L.marker([departure.lat, departure.lng], {
      draggable: true,
      icon: L.divIcon({ className: "", html: '<div style="background:#e11d48;width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px #e11d48"></div>', iconSize: [18,18], iconAnchor: [9,9] }),
    }).addTo(overlay).bindPopup("<strong>Point de départ</strong><br>Glisse-moi ou clique sur la carte")
    departureMarker.on("dragend", () => { const p = departureMarker.getLatLng(); setDeparture({ lat: p.lat, lng: p.lng }) })

    // Tracé
    if (routing.geometry.length > 1) {
      L.polyline(routing.geometry, { color: "#B355FF", weight: 3, opacity: 0.85, dashArray: routing.mode === "approx" ? "6 8" : undefined }).addTo(overlay)
    }

    // Marqueurs commandes
    for (const t of located) {
      const diff = dayDiff(t.scheduledDate); const u = urgency(diff)
      const sel = selectedIds.has(t.id); const n = orderIndex.get(t.id)
      const pts = pointsForAmount(t.total ?? 0)
      const key = t.userToken || t.customerName || ""; const count = orderCountByClient.get(key) ?? 1
      const inner = sel && n != null ? String(n) : ""
      const size = sel ? 26 : 18
      const html = `<div style="display:flex;align-items:center;justify-content:center;background:${u.color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid #111;box-shadow:0 0 0 1.5px ${u.color};color:#fff;font-size:12px;font-weight:700;${sel ? "" : "opacity:0.5"}">${inner}</div>`
      const popup = `<div style="min-width:190px;font-family:monospace;font-size:12px;line-height:1.6">
        <div style="font-weight:700;font-size:13px;margin-bottom:4px">${escapeHtml(t.customerName ?? "—")}</div>
        <div style="display:inline-block;background:${u.color};color:#fff;font-size:11px;font-weight:600;padding:1px 8px;border-radius:999px;margin-bottom:6px">${escapeHtml(u.label)}</div>
        <div><b>Produits :</b> ${escapeHtml(t.products ?? "—")}</div>
        <div><b>Montant :</b> ${t.total ?? 0}€</div>
        <div><b>Mode :</b> ${t.fulfillment === "meetup" ? "Meet-up" : "Livraison"}</div>
        <div><b>Points :</b> +${pts}</div>
        <div><b>Commandes client :</b> ${count}</div>
        <div><b>Adresse :</b> ${escapeHtml(t.address ?? "—")}</div>
      </div>`
      const marker = L.marker([t.lat, t.lng], { icon: L.divIcon({ className: "", html, iconSize: [size,size], iconAnchor: [size/2,size/2] }) }).addTo(overlay).bindPopup(popup)
      marker.on("click", () => toggleSelected(t.id))
    }

    const pts: [number, number][] = [[departure.lat, departure.lng], ...located.map((t) => [t.lat, t.lng] as [number, number])]
    if (pts.length > 1) map.fitBounds(pts, { padding: [40,40], maxZoom: 14 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, located, selectedIds, departure, routing, orderIndex, orderCountByClient])

  const unlocatedCount = threads.filter((t) => !isClosedStatus(t.status)).length - located.length
  const deliveredCount  = threads.filter((t) =>  isClosedStatus(t.status)).length

  const legend = [
    { color: "#ef4444", label: "Aujourd'hui" },
    { color: "#f97316", label: "J+1" },
    { color: "#eab308", label: "J+2" },
    { color: "#22c55e", label: "J+3+" },
    { color: "#9ca3af", label: "Sans date" },
  ]

  const durationLabel = useMemo(() => {
    const min = Math.round(routing.durationMin); if (min <= 0) return null
    if (min < 60) return `${min} min`
    const h = Math.floor(min / 60); const m = min % 60
    return m ? `${h} h ${m} min` : `${h} h`
  }, [routing.durationMin])

  return (
    <div className="flex flex-col gap-4">
      {/* En-tête */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center bg-violet-electric/10 ring-1 ring-violet-electric/30">
          <MapIcon className="h-4 w-4 text-violet-electric" />
        </div>
        <div>
          <p className="font-display text-sm tracking-widest text-ivory">Tournée de livraison</p>
          <p className="font-mono text-[10px] text-ivory/40">
            Clique sur la carte ou glisse le point rouge pour définir le départ. L&apos;itinéraire suit les routes.
          </p>
        </div>
      </div>

      {/* Légende urgence */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border border-white/10 bg-surface/40 px-4 py-2">
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-ivory/40">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#e11d48]" /> Départ
        </span>
        <span className="h-3 w-px bg-white/10" />
        {legend.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5 font-mono text-[10px] text-ivory/40">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
        {/* Carte */}
        <div
          ref={containerRef}
          className="h-[60vh] min-h-[400px] w-full overflow-hidden border border-white/10"
          aria-label="Carte des livraisons"
        />

        {/* Panneau itinéraire */}
        <div className="flex max-h-[60vh] min-h-[400px] flex-col overflow-hidden border border-white/10 bg-surface/40">
          <div className="border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-violet-electric" />
              <p className="font-mono text-xs uppercase tracking-widest text-ivory">Itinéraire optimisé</p>
              {routeLoading && <Loader2 className="h-3 w-3 animate-spin text-ivory/40" />}
            </div>
            <p className="mt-1 font-mono text-[10px] text-ivory/40">
              {route.length} arrêt{route.length > 1 ? "s" : ""} · ~{routing.distanceKm.toFixed(1)} km
              {durationLabel && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {durationLabel}
                </span>
              )}
            </p>
            {routing.mode === "approx" && route.length > 0 && (
              <p className="mt-0.5 font-mono text-[10px] text-signal">Routage indisponible — estimation à vol d&apos;oiseau.</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button onClick={() => setSelectedIds(new Set(located.map((t) => t.id)))}
                className="border border-white/10 px-2 py-1 font-mono text-[10px] text-ivory/60 transition hover:border-violet-electric/40 hover:text-ivory">
                Tout sélectionner
              </button>
              <button onClick={() => setSelectedIds(new Set())}
                className="border border-white/10 px-2 py-1 font-mono text-[10px] text-ivory/60 transition hover:border-violet-electric/40 hover:text-ivory">
                Tout retirer
              </button>
              <button onClick={saveOrigin} disabled={savingOrigin}
                className="ml-auto flex items-center gap-1 border border-violet-electric/30 bg-violet-electric/10 px-2 py-1 font-mono text-[10px] text-violet-electric transition hover:bg-violet-electric/20 disabled:opacity-40">
                {savingOrigin ? <Loader2 className="h-3 w-3 animate-spin" /> : savedOrigin ? <Check className="h-3 w-3" /> : <Save className="h-3 w-3" />}
                {savedOrigin ? "Enregistré" : "Mémoriser"}
              </button>
              <button onClick={() => setDeparture(DEFAULT_ORIGIN)}
                className="flex items-center gap-1 border border-white/10 px-2 py-1 font-mono text-[10px] text-ivory/60 transition hover:text-ivory">
                <RotateCcw className="h-3 w-3" /> Départ
              </button>
            </div>
          </div>

          {/* Liste des arrêts */}
          <ul className="flex-1 overflow-y-auto">
            {located.length === 0 && (
              <li className="px-4 py-6 text-center font-mono text-sm text-ivory/30">
                Aucune commande à livrer.
              </li>
            )}
            {located.map((t) => {
              const u = urgency(dayDiff(t.scheduledDate))
              const sel = selectedIds.has(t.id)
              const n = orderIndex.get(t.id)
              const legDist = routing.legKm[t.id]
              return (
                <li key={t.id}>
                  <label className={`flex cursor-pointer items-center gap-3 border-b border-white/5 px-4 py-2.5 transition hover:bg-white/[0.03] ${sel ? "" : "opacity-50"}`}>
                    <input type="checkbox" checked={sel} onChange={() => toggleSelected(t.id)} className="h-4 w-4 shrink-0 accent-violet-electric" />
                    {sel && n != null && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-electric font-mono text-[10px] font-bold text-void">
                        {n}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-mono text-xs text-ivory">{t.customerName}</span>
                        {t.fulfillment === "meetup"
                          ? <Store className="h-3 w-3 shrink-0 text-ivory/30" />
                          : <Truck className="h-3 w-3 shrink-0 text-ivory/30" />}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-ivory/40">
                        <span className="inline-flex rounded-full px-1.5 py-0.5 font-bold text-void" style={{ background: u.color, fontSize: 9 }}>
                          {u.short}
                        </span>
                        <span>{t.total ?? 0}€</span>
                        {sel && legDist != null && <><span>·</span><span>{legDist.toFixed(1)} km</span></>}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {(unlocatedCount > 0 || deliveredCount > 0) && (
        <p className="flex items-center gap-2 border border-white/10 bg-surface/20 px-4 py-3 font-mono text-[10px] text-ivory/40">
          <MapPinOff className="h-4 w-4 shrink-0" />
          {unlocatedCount > 0 && <span>{unlocatedCount} commande{unlocatedCount > 1 ? "s" : ""} sans localisation.</span>}
          {deliveredCount > 0 && <span>{deliveredCount} livrée{deliveredCount > 1 ? "s" : ""} masquée{deliveredCount > 1 ? "s" : ""} de la carte.</span>}
        </p>
      )}
    </div>
  )
}
