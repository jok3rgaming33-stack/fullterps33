"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search, ChevronDown, ChevronUp, Plus, Minus,
  Flag, Trash2, RotateCcw, MessageSquare, X, Check, StickyNote,
} from "lucide-react"
import type { AdminUser } from "@/app/actions/account"
import {
  setUserFlag, adjustLoyaltyPoints, saveAdminNotes, softDeleteUser, restoreUser,
} from "@/app/actions/account"
import { formatPrice } from "@/lib/utils"

const FLAG_CONFIG = {
  fidele:  { label: "Fidèle",   color: "text-emerald-400  ring-emerald-400/30  bg-emerald-400/10"  },
  suspect: { label: "Suspect",  color: "text-amber-400    ring-amber-400/30    bg-amber-400/10"    },
  absent:  { label: "Absent",   color: "text-zinc-400     ring-zinc-400/30     bg-zinc-400/10"     },
  banni:   { label: "Banni",    color: "text-red-400      ring-red-400/30      bg-red-400/10"      },
} as const
type FlagKey = keyof typeof FLAG_CONFIG

const FILTER_FLAGS = ["tous", "fidele", "suspect", "absent", "banni", "supprimé"] as const

export function AdminUsersPanel({ users: initial }: { users: AdminUser[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [search,     setSearch]     = useState("")
  const [filterFlag, setFilterFlag] = useState<(typeof FILTER_FLAGS)[number]>("tous")
  const [sortBy,     setSortBy]     = useState<"date" | "commandes" | "ca" | "points">("date")
  const [sortDir,    setSortDir]    = useState<"asc" | "desc">("desc")
  const [expanded,   setExpanded]   = useState<number | null>(null)
  const [pointsDelta, setPointsDelta] = useState<Record<number, string>>({})
  const [notesVal,    setNotesVal]    = useState<Record<number, string>>({})
  const [contactId,   setContactId]   = useState<number | null>(null)
  const [contactMsg,  setContactMsg]  = useState("")

  /* ── filtrage + tri ── */
  const filtered = useMemo(() => {
    let list = [...initial]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (u) => u.pseudo.toLowerCase().includes(q) || u.token.includes(q) || (u.created_ip ?? "").includes(q),
      )
    }

    if (filterFlag !== "tous") {
      if (filterFlag === "supprimé") {
        list = list.filter((u) => u.deleted_at)
      } else {
        list = list.filter((u) => !u.deleted_at && u.flags?.[filterFlag])
      }
    } else {
      list = list.filter((u) => !u.deleted_at)
    }

    list.sort((a, b) => {
      let diff = 0
      if (sortBy === "date")      diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortBy === "commandes") diff = a.order_count - b.order_count
      if (sortBy === "ca")        diff = a.total_spent - b.total_spent
      if (sortBy === "points")    diff = a.loyalty_points - b.loyalty_points
      return sortDir === "desc" ? -diff : diff
    })

    return list
  }, [initial, search, filterFlag, sortBy, sortDir])

  /* ── actions ── */
  function handleFlag(userId: number, flag: FlagKey, current: boolean) {
    startTransition(async () => {
      await setUserFlag(userId, flag, !current)
      router.refresh()
    })
  }

  function handlePoints(userId: number, delta: number) {
    const raw  = pointsDelta[userId] ?? "10"
    const val  = Math.abs(parseInt(raw) || 10)
    const reason = `Ajustement manuel admin (${delta > 0 ? "+" : "-"}${val})`
    startTransition(async () => {
      await adjustLoyaltyPoints(userId, delta * val, reason)
      setPointsDelta((p) => ({ ...p, [userId]: "10" }))
      router.refresh()
    })
  }

  function handleNotesSave(userId: number) {
    const notes = notesVal[userId] ?? ""
    startTransition(async () => {
      await saveAdminNotes(userId, notes)
      router.refresh()
    })
  }

  function handleDelete(userId: number) {
    startTransition(async () => {
      await softDeleteUser(userId)
      router.refresh()
    })
  }

  function handleRestore(userId: number) {
    startTransition(async () => {
      await restoreUser(userId)
      router.refresh()
    })
  }

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortBy(col); setSortDir("desc") }
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col
      ? sortDir === "desc"
        ? <ChevronDown className="inline h-3 w-3 ml-0.5" />
        : <ChevronUp   className="inline h-3 w-3 ml-0.5" />
      : null

  /* ── render ── */
  return (
    <div className="space-y-4">

      {/* ── barre outils ── */}
      <div className="flex flex-wrap gap-3">
        {/* recherche */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ivory/30 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pseudo, token, IP…"
            className="input-admin pl-8 py-2"
          />
        </div>

        {/* filtre flag */}
        <div className="flex flex-wrap gap-1">
          {FILTER_FLAGS.map((f) => (
            <button
              key={f}
              onClick={() => setFilterFlag(f)}
              className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest border transition ${
                filterFlag === f
                  ? "border-violet-electric text-violet-electric bg-violet-electric/10"
                  : "border-white/10 text-ivory/40 hover:text-ivory"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── en-têtes colonnes ── */}
      <div className="hidden md:grid grid-cols-[1fr_80px_80px_80px_100px_auto] gap-2 px-4 font-mono text-[9px] uppercase tracking-widest text-ivory/30">
        <span>Membre</span>
        <button onClick={() => toggleSort("commandes")} className="text-left hover:text-ivory/60">
          Cmd <SortIcon col="commandes" />
        </button>
        <button onClick={() => toggleSort("ca")} className="text-left hover:text-ivory/60">
          CA <SortIcon col="ca" />
        </button>
        <button onClick={() => toggleSort("points")} className="text-left hover:text-ivory/60">
          Pts <SortIcon col="points" />
        </button>
        <span>Flags</span>
        <span>Actions</span>
      </div>

      {/* ── liste ── */}
      {filtered.length === 0 && (
        <p className="py-8 text-center font-mono text-sm text-ivory/30">Aucun membre trouvé.</p>
      )}

      {filtered.map((u) => {
        const isOpen    = expanded === u.id
        const isBanned  = u.flags?.banni
        const isDeleted = !!u.deleted_at

        return (
          <div
            key={u.id}
            className={`border transition ${
              isDeleted
                ? "border-red-500/20 bg-red-500/5 opacity-60"
                : isBanned
                ? "border-red-400/20 bg-surface/30"
                : "border-white/10 bg-surface/40 hover:bg-surface/70"
            }`}
          >
            {/* ligne principale */}
            <div
              className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_80px_80px_80px_100px_auto] gap-2 items-center px-4 py-3 cursor-pointer"
              onClick={() => setExpanded(isOpen ? null : u.id)}
            >
              {/* pseudo + infos */}
              <div>
                <p className="font-display text-sm tracking-wide text-violet-electric">
                  {u.pseudo}
                  {isDeleted && <span className="ml-2 font-mono text-[9px] text-red-400 uppercase">[supprimé]</span>}
                </p>
                <p className="font-mono text-[10px] text-ivory/30">
                  {u.token.slice(0, 12)}… &middot; {new Date(u.created_at).toLocaleDateString("fr-FR")}
                  {u.created_ip && ` · IP ${u.created_ip}`}
                </p>
              </div>

              {/* commandes */}
              <span className="font-mono text-sm text-ivory/70 text-center hidden md:block">
                {u.order_count}
              </span>

              {/* CA */}
              <span className="font-mono text-sm text-ivory/70 text-center hidden md:block">
                {formatPrice(u.total_spent)}
              </span>

              {/* points */}
              <span className="font-mono text-sm font-bold text-violet-electric text-center hidden md:block">
                {u.loyalty_points}
              </span>

              {/* flags actifs */}
              <div className="hidden md:flex flex-wrap gap-1">
                {(Object.keys(FLAG_CONFIG) as FlagKey[])
                  .filter((f) => u.flags?.[f])
                  .map((f) => (
                    <span
                      key={f}
                      className={`px-1.5 py-0.5 font-mono text-[9px] uppercase ring-1 ${FLAG_CONFIG[f].color}`}
                    >
                      {FLAG_CONFIG[f].label}
                    </span>
                  ))}
              </div>

              {/* chevron */}
              <div className="flex items-center gap-2">
                {isOpen
                  ? <ChevronUp   className="h-4 w-4 text-ivory/40" />
                  : <ChevronDown className="h-4 w-4 text-ivory/40" />}
              </div>
            </div>

            {/* ── détail expandé ── */}
            {isOpen && (
              <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-5">

                {/* stats mobile */}
                <div className="flex gap-4 md:hidden font-mono text-xs text-ivory/50">
                  <span>{u.order_count} cmd</span>
                  <span>{formatPrice(u.total_spent)} CA</span>
                  <span className="text-violet-electric">{u.loyalty_points} pts</span>
                </div>

                {/* flags */}
                <div>
                  <p className="label-admin mb-2">Flags</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(FLAG_CONFIG) as FlagKey[]).map((f) => {
                      const active = !!u.flags?.[f]
                      return (
                        <button
                          key={f}
                          onClick={() => handleFlag(u.id, f, active)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ring-1 transition ${
                            active
                              ? FLAG_CONFIG[f].color
                              : "text-ivory/30 ring-white/10 bg-transparent hover:ring-white/30"
                          }`}
                        >
                          {active && <Check className="h-3 w-3" />}
                          <Flag className="h-3 w-3" />
                          {FLAG_CONFIG[f].label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* points fidélité */}
                <div>
                  <p className="label-admin mb-2">
                    Points fidélité —{" "}
                    <span className="text-violet-electric">{u.loyalty_points} pts</span>
                    {u.loyalty_adjustment !== 0 && (
                      <span className="ml-2 text-ivory/30">
                        (ajust. manuel : {u.loyalty_adjustment > 0 ? "+" : ""}{u.loyalty_adjustment})
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePoints(u.id, -1)}
                      className="flex items-center gap-1 border border-red-500/30 px-3 py-1.5 font-mono text-[10px] text-red-400 uppercase hover:bg-red-500/10 transition"
                    >
                      <Minus className="h-3 w-3" />
                      Retirer
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={pointsDelta[u.id] ?? "10"}
                      onChange={(e) => setPointsDelta((p) => ({ ...p, [u.id]: e.target.value }))}
                      className="input-admin w-20 text-center py-1.5"
                    />
                    <button
                      onClick={() => handlePoints(u.id, 1)}
                      className="flex items-center gap-1 border border-emerald-500/30 px-3 py-1.5 font-mono text-[10px] text-emerald-400 uppercase hover:bg-emerald-500/10 transition"
                    >
                      <Plus className="h-3 w-3" />
                      Ajouter
                    </button>
                  </div>
                </div>

                {/* notes admin */}
                <div>
                  <p className="label-admin mb-2 flex items-center gap-1.5">
                    <StickyNote className="h-3 w-3" /> Notes internes
                  </p>
                  <textarea
                    rows={3}
                    value={notesVal[u.id] ?? (u.admin_notes ?? "")}
                    onChange={(e) => setNotesVal((p) => ({ ...p, [u.id]: e.target.value }))}
                    placeholder="Notes visibles uniquement par l'admin…"
                    className="input-admin resize-none"
                  />
                  <button
                    onClick={() => handleNotesSave(u.id)}
                    className="mt-2 border border-white/20 px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-ivory/60 hover:border-violet-electric hover:text-violet-electric transition"
                  >
                    Sauvegarder notes
                  </button>
                </div>

                {/* bouton contacter + supprimer/restaurer */}
                <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
                  <button
                    onClick={() => { setContactId(u.id); setContactMsg("") }}
                    className="flex items-center gap-1.5 border border-violet-electric/30 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-violet-electric hover:bg-violet-electric/10 transition"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Contacter
                  </button>

                  {isDeleted ? (
                    <button
                      onClick={() => handleRestore(u.id)}
                      className="flex items-center gap-1.5 border border-emerald-500/30 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/10 transition"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restaurer
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="flex items-center gap-1.5 border border-red-500/30 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </button>
                  )}
                </div>

              </div>
            )}
          </div>
        )
      })}

      {/* ── modale Contacter ── */}
      {contactId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4">
          <div className="clip-card w-full max-w-md border border-white/10 bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-display text-base tracking-wide">
                Contacter{" "}
                <span className="text-violet-electric">
                  {initial.find((u) => u.id === contactId)?.pseudo}
                </span>
              </p>
              <button onClick={() => setContactId(null)} className="text-ivory/40 hover:text-ivory">
                <X className="h-5 w-5" />
              </button>
            </div>

            <textarea
              rows={4}
              value={contactMsg}
              onChange={(e) => setContactMsg(e.target.value)}
              placeholder="Votre message…"
              className="input-admin resize-none"
            />

            <p className="font-mono text-[10px] text-ivory/30">
              La messagerie membre sera intégrée en Phase 2. Ce message sera enregistré dans les notes internes pour l&apos;instant.
            </p>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setContactId(null)}
                className="border border-white/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-ivory/40 hover:text-ivory transition"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (!contactMsg.trim()) return
                  startTransition(async () => {
                    await saveAdminNotes(
                      contactId,
                      `[MSG ${new Date().toLocaleDateString("fr-FR")}] ${contactMsg}\n${
                        initial.find((u) => u.id === contactId)?.admin_notes ?? ""
                      }`,
                    )
                    router.refresh()
                    setContactId(null)
                    setContactMsg("")
                  })
                }}
                className="clip-tag bg-violet-electric/20 px-5 py-2 font-mono text-[10px] uppercase tracking-widest text-violet-electric ring-1 ring-violet-electric/40 hover:bg-violet-electric/30 transition"
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
