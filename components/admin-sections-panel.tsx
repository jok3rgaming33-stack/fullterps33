"use client"

import { useState, useTransition } from "react"
import { Plus, Trash2, GripVertical, Pencil, Check, X } from "lucide-react"
import { setShopSections, type ShopSection } from "@/app/actions/settings"

type Props = {
  initial: ShopSection[]
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40)
}

const GRID_OPTIONS = [
  { value: "md:grid-cols-2", label: "2 colonnes" },
  { value: "md:grid-cols-3", label: "3 colonnes" },
  { value: "md:grid-cols-4", label: "4 colonnes" },
]

export function AdminSectionsPanel({ initial }: Props) {
  const [sections, setSections] = useState<ShopSection[]>(initial)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState<ShopSection | null>(null)
  const [newForm, setNewForm] = useState<Omit<ShopSection, "slug"> & { slugOverride: string }>({
    eyebrow: "",
    title: "",
    gridCols: "md:grid-cols-4",
    slugOverride: "",
  })
  const [showNew, setShowNew] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [isPending, startTransition] = useTransition()

  function fb(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(""), 3000)
  }

  function save(next: ShopSection[]) {
    startTransition(async () => {
      const result = await setShopSections(next)
      if (result.ok) {
        setSections(next)
        fb("Sections sauvegardées")
      } else {
        fb(`Erreur : ${result.error ?? "inconnue"}`)
      }
    })
  }

  function startEdit(i: number) {
    setEditIndex(i)
    setDraft({ ...sections[i] })
  }

  function commitEdit() {
    if (editIndex === null || !draft) return
    if (!draft.slug.trim() || !draft.eyebrow.trim() || !draft.title.trim()) return
    const next = sections.map((s, i) => (i === editIndex ? draft : s))
    save(next)
    setEditIndex(null)
    setDraft(null)
  }

  function cancelEdit() {
    setEditIndex(null)
    setDraft(null)
  }

  function remove(i: number) {
    if (!confirm(`Supprimer la section "${sections[i].title}" ?`)) return
    const next = sections.filter((_, idx) => idx !== i)
    save(next)
  }

  function addSection() {
    const slug = newForm.slugOverride.trim() || slugify(newForm.title)
    if (!slug || !newForm.eyebrow.trim() || !newForm.title.trim()) return
    if (sections.some((s) => s.slug === slug)) {
      fb("Un slug identique existe déjà.")
      return
    }
    const next: ShopSection[] = [
      ...sections,
      { slug, eyebrow: newForm.eyebrow, title: newForm.title, gridCols: newForm.gridCols },
    ]
    save(next)
    setNewForm({ eyebrow: "", title: "", gridCols: "md:grid-cols-4", slugOverride: "" })
    setShowNew(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl tracking-wide text-ivory">Sections boutique</h2>
        {feedback && (
          <span className="font-mono text-xs text-green-400">{feedback}</span>
        )}
      </div>

      <p className="font-mono text-xs text-ivory/40 leading-relaxed">
        Chaque section correspond à une catégorie de produits affichée sur la page d&apos;accueil. Le <strong className="text-ivory/60">slug</strong> est l&apos;identifiant interne — assignez-le dans le champ &ldquo;Section&rdquo; du formulaire produit.
      </p>

      {/* Liste */}
      <div className="flex flex-col gap-2">
        {sections.length === 0 && (
          <p className="font-mono text-sm text-ivory/40 italic">Aucune section. Ajoutez-en une ci-dessous.</p>
        )}
        {sections.map((sec, i) => (
          <div key={sec.slug} className="border border-white/10 bg-surface p-4">
            {editIndex === i && draft ? (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="label-admin">Sur-titre (eyebrow)</label>
                    <input
                      className="input-admin"
                      value={draft.eyebrow}
                      onChange={(e) => setDraft({ ...draft, eyebrow: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="label-admin">Titre principal</label>
                    <input
                      className="input-admin"
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="label-admin">Slug (clé interne)</label>
                    <input
                      className="input-admin font-mono text-xs"
                      value={draft.slug}
                      onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="label-admin">Colonnes grille</label>
                    <select
                      className="input-admin"
                      value={draft.gridCols}
                      onChange={(e) => setDraft({ ...draft, gridCols: e.target.value })}
                    >
                      {GRID_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={commitEdit}
                    disabled={isPending}
                    className="flex items-center gap-1.5 border border-green-400/30 bg-green-400/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-green-400 hover:bg-green-400/20 disabled:opacity-40"
                  >
                    <Check size={12} /> Enregistrer
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1.5 border border-white/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-ivory/50 hover:border-white/30"
                  >
                    <X size={12} /> Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <GripVertical size={14} className="text-ivory/20 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-display text-sm text-ivory truncate">{sec.title}</div>
                    <div className="font-mono text-[11px] text-ivory/40">{sec.eyebrow} &middot; slug: <span className="text-violet-electric/80">{sec.slug}</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => startEdit(i)}
                    className="flex items-center gap-1 border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-ivory/60 hover:border-white/30 hover:text-ivory"
                  >
                    <Pencil size={11} /> Modifier
                  </button>
                  <button
                    onClick={() => remove(i)}
                    disabled={isPending}
                    className="flex items-center gap-1 border border-red-500/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-red-400/70 hover:border-red-500/40 hover:text-red-400 disabled:opacity-40"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Formulaire ajout */}
      {showNew ? (
        <div className="border border-violet-electric/30 bg-surface p-4 flex flex-col gap-3">
          <p className="font-mono text-xs uppercase tracking-widest text-violet-electric">Nouvelle section</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="label-admin">Sur-titre (eyebrow)</label>
              <input
                className="input-admin"
                placeholder="Ex : En vedette"
                value={newForm.eyebrow}
                onChange={(e) => setNewForm({ ...newForm, eyebrow: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="label-admin">Titre principal</label>
              <input
                className="input-admin"
                placeholder="Ex : Édition Capsule"
                value={newForm.title}
                onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="label-admin">Slug (auto depuis le titre)</label>
              <input
                className="input-admin font-mono text-xs"
                placeholder={slugify(newForm.title) || "ex: vedette"}
                value={newForm.slugOverride}
                onChange={(e) => setNewForm({ ...newForm, slugOverride: slugify(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="label-admin">Colonnes grille</label>
              <select
                className="input-admin"
                value={newForm.gridCols}
                onChange={(e) => setNewForm({ ...newForm, gridCols: e.target.value })}
              >
                {GRID_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addSection}
              disabled={isPending || !newForm.eyebrow.trim() || !newForm.title.trim()}
              className="flex items-center gap-1.5 bg-violet-electric px-5 py-2 font-mono text-xs font-bold uppercase tracking-widest text-void hover:brightness-110 disabled:opacity-40"
            >
              <Plus size={12} /> Ajouter
            </button>
            <button
              onClick={() => setShowNew(false)}
              className="border border-white/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-ivory/50 hover:border-white/30"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 self-start border border-white/10 px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-ivory/60 hover:border-violet-electric/40 hover:text-violet-electric"
        >
          <Plus size={13} /> Nouvelle section
        </button>
      )}
    </div>
  )
}
