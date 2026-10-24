"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { listLoginLogs, type LoginLogRow } from "@/app/actions/login-logs"

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

export function AdminLoginLogs() {
  const [rows, setRows] = useState<LoginLogRow[] | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    void listLoginLogs().then(setRows).catch(() => setRows([]))
  }, [])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !rows) return rows ?? []
    return rows.filter((row) =>
      row.pseudo.toLowerCase().includes(q) ||
      (row.ip ?? "").includes(q) ||
      (row.city ?? "").toLowerCase().includes(q) ||
      (row.country ?? "").toLowerCase().includes(q),
    )
  }, [rows, query])

  if (!rows) {
    return (
      <p className="flex items-center gap-2 font-mono text-xs text-ivory/40">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement du journal
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl font-mono text-xs text-ivory/45">
          Connexions des membres : création de compte, token et biométrie. La ville vient de l&apos;hébergeur quand il la transmet. Les sessions déjà ouvertes avant cette mise à jour n&apos;apparaissent pas.
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pseudo, IP, ville"
          className="w-full max-w-xs border border-white/10 bg-void px-3 py-2 font-mono text-xs text-ivory outline-none focus:border-violet-electric/50 sm:w-56"
        />
      </div>
      {visible.length === 0 ? (
        <p className="font-mono text-sm text-ivory/40">Aucune connexion enregistrée.</p>
      ) : (
        <div className="overflow-x-auto border border-white/10">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-surface/60 font-mono text-[9px] uppercase tracking-widest text-ivory/35">
              <tr>
                <th className="px-3 py-2 font-medium">Quand</th>
                <th className="px-3 py-2 font-medium">Membre</th>
                <th className="px-3 py-2 font-medium">IP</th>
                <th className="px-3 py-2 font-medium">Lieu</th>
                <th className="px-3 py-2 font-medium">Appareil</th>
                <th className="px-3 py-2 font-medium">Déconnexion</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className="border-t border-white/5 font-mono text-[11px] text-ivory/70">
                  <td className="whitespace-nowrap px-3 py-2">{fmt(row.createdAt)}</td>
                  <td className="px-3 py-2 text-ivory">{row.pseudo}</td>
                  <td className="px-3 py-2">{row.ip ?? "—"}</td>
                  <td className="px-3 py-2">{[row.city, row.country].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-3 py-2">{device(row.userAgent)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{row.loggedOutAt ? fmt(row.loggedOutAt) : "Ouverte"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
