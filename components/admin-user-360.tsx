"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Loader2, X } from "lucide-react"
import { getUser360, type User360Data } from "@/app/actions/user-360"
import { fulfillmentLabel, statusMeta } from "@/lib/order-status"
import { formatPrice } from "@/lib/utils"

const FLAGS: Record<string, string> = {
  fidele: "Fidèle",
  suspect: "Suspect",
  absent: "Absent",
  banni: "Banni",
}

const KYC: Record<string, string> = {
  pending: "En attente",
  validated: "Validée",
  rejected: "Refusée",
}

function fmt(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

function device(agent: string | null) {
  if (!agent) return "—"
  if (/iPhone|iPad/.test(agent)) return "iPhone / iPad"
  if (/Android/.test(agent)) return "Android"
  if (/Windows/.test(agent)) return "Windows"
  if (/Mac OS/.test(agent)) return "Mac"
  return "Autre"
}

export function AdminUser360({ userId, onClose }: { userId: number; onClose: () => void }) {
  const [data, setData] = useState<User360Data | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    getUser360(userId).then((result) => {
      if (cancelled) return
      if (!result.ok) setError(result.error)
      else setData(result.data)
    }).catch(() => {
      if (!cancelled) setError("Impossible de charger la fiche.")
    })
    return () => { cancelled = true }
  }, [userId])

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-void/80 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Fiche membre">
      <button type="button" className="absolute inset-0" aria-label="Fermer" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-3xl flex-col border border-white/10 bg-surface">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-electric">Fiche membre</p>
            <h2 className="mt-1 font-display text-2xl tracking-wide">{data?.pseudo ?? "Membre"}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-ivory/50 hover:text-ivory" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-6 overflow-y-auto px-5 py-4">
          {!data && !error && (
            <p className="flex items-center gap-2 font-mono text-xs text-ivory/40">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement
            </p>
          )}
          {error && <p className="font-mono text-sm text-red-300">{error}</p>}
          {data && (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  ["Commandes", String(data.orderCount)],
                  ["Livrées", String(data.deliveredCount)],
                  ["CA livré", formatPrice(data.totalSpentDelivered)],
                  ["Points", String(data.loyaltyPoints)],
                ].map(([label, value]) => (
                  <div key={label} className="border border-white/10 bg-void/40 px-3 py-2">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-ivory/35">{label}</p>
                    <p className="mt-1 font-mono text-sm text-ivory">{value}</p>
                  </div>
                ))}
              </div>

              <section className="space-y-1 font-mono text-xs text-ivory/60">
                <p>Inscrit le {fmt(data.createdAt)}{data.createdIp ? ` · IP ${data.createdIp}` : ""}</p>
                <p>
                  Vérification : {data.verification ? (KYC[data.verification.status] ?? data.verification.status) : "Aucune"}
                  {data.discussionCount > 0 ? ` · ${data.discussionCount} discussion${data.discussionCount > 1 ? "s" : ""}` : ""}
                  {data.loyaltyAdjustment !== 0 ? ` · ajustement points ${data.loyaltyAdjustment > 0 ? "+" : ""}${data.loyaltyAdjustment}` : ""}
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {Object.entries(data.flags).filter(([, on]) => on).map(([key]) => (
                    <span key={key} className="border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-ivory/70">
                      {FLAGS[key] ?? key}
                    </span>
                  ))}
                  {data.deletedAt && <span className="text-[10px] uppercase tracking-widest text-red-300">Compte retiré</span>}
                </div>
                {data.adminNotes?.trim() && (
                  <p className="whitespace-pre-wrap pt-2 text-ivory/45">{data.adminNotes.trim()}</p>
                )}
              </section>

              <Section title="Commandes">
                {data.orders.length === 0 ? <Empty>Aucune commande.</Empty> : data.orders.map((order) => {
                  const meta = statusMeta(order.status)
                  return (
                    <li key={order.id} className="flex items-start justify-between gap-3 border-b border-white/5 py-2">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs text-ivory">#{order.id} · {order.summary}</p>
                        <p className="font-mono text-[10px] text-ivory/35">
                          {fmt(order.createdAt)} · {fulfillmentLabel(order.fulfillment)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-xs">{formatPrice(order.total)}</p>
                        <p className={`font-mono text-[10px] uppercase ${meta.color}`}>{meta.label}</p>
                      </div>
                    </li>
                  )
                })}
              </Section>

              <Section title="Connexions">
                {data.logins.length === 0 ? <Empty>Aucune connexion enregistrée. Le journal commence aux prochaines connexions.</Empty> : data.logins.map((row) => (
                  <li key={row.id} className="border-b border-white/5 py-2 font-mono text-[11px] text-ivory/60">
                    <span className="text-ivory">{fmt(row.createdAt)}</span>
                    {" · "}
                    {row.ip ?? "IP inconnue"}
                    {(row.city || row.country) ? ` · ${[row.city, row.country].filter(Boolean).join(", ")}` : ""}
                    {" · "}
                    {device(row.userAgent)}
                    {row.loggedOutAt ? ` · déconnexion ${fmt(row.loggedOutAt)}` : " · session ouverte"}
                  </li>
                ))}
              </Section>

              <Section title="Avis laissés">
                {data.ratings.length === 0 ? <Empty>Aucun avis.</Empty> : data.ratings.map((row) => (
                  <li key={row.id} className="border-b border-white/5 py-2">
                    <p className="font-mono text-xs text-ivory">{row.productName} · {row.avgScore.toFixed(1)}/5</p>
                    <p className="font-mono text-[10px] text-ivory/35">{fmt(row.createdAt)}</p>
                    {row.comment && <p className="mt-1 font-sans text-sm text-ivory/70">{row.comment}</p>}
                  </li>
                ))}
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 font-display text-lg tracking-wide">{title}</h3>
      <ul>{children}</ul>
    </section>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <li className="font-mono text-xs text-ivory/40">{children}</li>
}
