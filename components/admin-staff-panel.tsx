"use client"

import { useEffect, useState, useTransition } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { createStaff, deleteStaff, listStaff, updateStaff, type StaffRole, type StaffRow } from "@/app/actions/staff"

const ROLES: { id: StaffRole; label: string }[] = [
  { id: "admin", label: "Admin" },
  { id: "livreur", label: "Livreur" },
]

export function AdminStaffPanel() {
  const [rows, setRows] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pseudo, setPseudo] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<StaffRole>("livreur")
  const [pending, startTransition] = useTransition()

  const reload = async () => {
    const list = await listStaff()
    setRows(list)
    setLoading(false)
  }

  useEffect(() => {
    void reload()
  }, [])

  const create = () => {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const res = await createStaff({ pseudo, password, role })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setPseudo("")
      setPassword("")
      setNotice("Compte créé. Transmets le pseudo et le mot de passe à la personne.")
      await reload()
    })
  }

  return (
    <div className="space-y-8">
      <form
        className="grid gap-3 border border-white/10 bg-surface/40 p-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          create()
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Pseudo</span>
          <input
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            className="border border-white/15 bg-void px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric"
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Mot de passe</span>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-white/15 bg-void px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric"
            autoComplete="new-password"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Rôle</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
            className="border border-white/15 bg-void px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-violet-electric"
          >
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="clip-tag bg-violet-electric px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-void disabled:opacity-50"
          >
            {pending ? "Création…" : "Ajouter"}
          </button>
        </div>
        <p className="sm:col-span-2 font-mono text-[11px] text-ivory/40">
          Un admin a le panel complet. Un livreur voit la carte, le détail des commandes, et seulement les statuts de livraison.
        </p>
      </form>

      {error && <p className="font-mono text-xs text-signal">{error}</p>}
      {notice && <p className="font-mono text-xs text-violet-electric">{notice}</p>}

      {loading ? (
        <p className="flex items-center gap-2 font-mono text-xs text-ivory/40">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </p>
      ) : rows.length === 0 ? (
        <p className="font-mono text-sm text-ivory/40">Aucun compte staff pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <StaffEditor key={row.id} row={row} onChange={reload} onError={setError} />
          ))}
        </ul>
      )}
    </div>
  )
}

function StaffEditor({
  row,
  onChange,
  onError,
}: {
  row: StaffRow
  onChange: () => Promise<void>
  onError: (msg: string | null) => void
}) {
  const [pseudo, setPseudo] = useState(row.pseudo)
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<StaffRole>(row.role)
  const [active, setActive] = useState(row.active)
  const [pending, startTransition] = useTransition()

  const save = () => {
    onError(null)
    startTransition(async () => {
      const res = await updateStaff({ id: row.id, pseudo, password, role, active })
      if (!res.ok) {
        onError(res.error)
        return
      }
      setPassword("")
      await onChange()
    })
  }

  const remove = () => {
    if (!window.confirm(`Supprimer le compte ${row.pseudo} ?`)) return
    onError(null)
    startTransition(async () => {
      const res = await deleteStaff(row.id)
      if (!res.ok) {
        onError(res.error)
        return
      }
      await onChange()
    })
  }

  return (
    <li className="grid gap-3 border border-white/10 bg-surface/30 p-4 sm:grid-cols-[1fr_1fr_auto]">
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Pseudo</span>
        <input
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          className="border border-white/15 bg-void px-3 py-2 font-mono text-sm outline-none focus:border-violet-electric"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Nouveau mot de passe</span>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Laisser vide pour garder"
          className="border border-white/15 bg-void px-3 py-2 font-mono text-sm outline-none focus:border-violet-electric"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/40">Rôle</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as StaffRole)}
          className="border border-white/15 bg-void px-3 py-2 font-mono text-sm outline-none focus:border-violet-electric"
        >
          {ROLES.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 font-mono text-xs text-ivory/70">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Actif
      </label>
      <div className="flex items-center gap-2 sm:col-span-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="border border-violet-electric/40 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-violet-electric disabled:opacity-50"
        >
          {pending ? "…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="inline-flex items-center gap-1 border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-signal disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Supprimer
        </button>
      </div>
    </li>
  )
}
