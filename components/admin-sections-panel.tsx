"use client"

import { useState, useTransition } from "react"
import { Plus, Trash2, GripVertical, Pencil, Check, X, ChevronDown, ChevronRight, PackageX } from "lucide-react"
import { setShopSections, type ShopSection } from "@/app/actions/settings"
import { removeProductFromSection } from "@/app/actions/products"
import type { Product } from "@/lib/types"

type Props = {
  initial: ShopSection[]
  products?: Product[]
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

export function AdminSectionsPanel({ initial, products = [] }: Props) {
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [feedback, setFeedback] = useState("")
  const [isPending, startTransition] = useTransition()
  const [localProducts, setLocalProducts] = useState<Product[]>(products)

  function fb(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(""), 3500)
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
    if (!confirm(`Supprimer la section "${sections[i].title}" ? Les produits resteront en base mais ne seront plus visibles.`)) return
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

  function toggleExpand(slug: string) {
    setExpanded((prev) => ({ ...prev, [slug]: !prev[slug] }))
  }

  function handleRemoveFromSection(productId: string) {
    startTransition(async () => {
      const r = await removeProductFromSection(productId)
      if (r.ok) {
        setLocalProducts((prev) => prev.map((p) => p.id === productId ? { ...p, section: "" } : p))
        fb("Produit retiré de la section")
      } else {
        fb(`Erreur : ${r.error}`)
      }
    })
  }

  // Produits sans section valide
  const orphans = localProducts.filter((p) => !p.section || !sections.some((s) => s.slug === p.section))

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl tracking-wide text-ivory">Sections boutique</h2>
        {feedback && (
          <span className={`font-mono text-xs ${feedback.startsWith("Erreur") ? "text-signal" : "text-green-400"}`}>
            {feedback}
          </span>
        )}
      </div>

      <p className="font-mono text-xs text-ivory/40 leading-relaxed">
        Chaque section correspond à une catégorie affichée sur la page d&apos;accueil. Le <strong className="text-ivory/60">slug</strong> est l&apos;identifiant interne — assignez-le dans le champ &ldquo;Section&rdquo; du formulaire produit.
      </p>

      {/* Liste des sections avec leurs produits */}
      <div className="flex flex-col gap-3">
        {sections.length === 0 && (
          <p className="font-mono text-sm text-ivory/40 italic">Aucune section. Ajoutez-en une ci-dessous.</p>
        )}

        {sections.map((sec, i) => {
          const sectionProducts = localProducts.filter((p) => p.section === sec.slug)
          const isExpanded = expanded[sec.slug] ?? false

          return (
            <div key={sec.slug} className="border border-white/10 bg-surface">
              {/* En-tête de section */}
              {editIndex === i && draft ? (
                <div className="p-4 flex flex-col gap-3">
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
                <>
                  <div className="flex items-center justify-between gap-4 p-4">
                    <button
                      onClick={() => toggleExpand(sec.slug)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      {isExpanded
                        ? <ChevronDown size={14} className="text-ivory/40 shrink-0" />
                        : <ChevronRight size={14} className="text-ivory/40 shrink-0" />
                      }
                      <GripVertical size={14} className="text-ivory/20 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-display text-sm text-ivory truncate">{sec.title}</div>
                        <div className="font-mono text-[11px] text-ivory/40 flex items-center gap-2">
                          <span>{sec.eyebrow}</span>
                          <span className="text-ivory/20">&middot;</span>
                          <span>slug: <span className="text-violet-electric/80">{sec.slug}</span></span>
                          <span className="text-ivory/20">&middot;</span>
                          <span className={sectionProducts.length === 0 ? "text-ivory/30" : "text-ivory/60"}>
                            {sectionProducts.length} produit{sectionProducts.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </button>
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

                  {/* Produits de la section (dépliable) */}
                  {isExpanded && (
                    <div className="border-t border-white/5 px-4 py-3 flex flex-col gap-1.5">
                      {sectionProducts.length === 0 ? (
                        <p className="font-mono text-xs text-ivory/30 italic">Aucun produit dans cette section.</p>
                      ) : (
                        sectionProducts.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between gap-3 rounded border border-white/5 bg-white/[0.02] px-3 py-2"
                          >
                            <div className="min-w-0 flex items-center gap-2">
                              <span className="font-mono text-[10px] text-ivory/30 uppercase">{p.sku}</span>
                              <span className="font-display text-sm text-ivory truncate">{p.name}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveFromSection(p.id)}
                              disabled={isPending}
                              title="Retirer de cette section"
                              className="shrink-0 flex items-center gap-1 border border-red-500/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-red-400/60 hover:border-red-500/50 hover:text-red-400 disabled:opacity-40"
                            >
                              <PackageX size={11} /> Retirer
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Produits sans section */}
      {orphans.length > 0 && (
        <div className="border border-yellow-500/20 bg-yellow-500/5 p-4 flex flex-col gap-3">
          <p className="font-mono text-xs uppercase tracking-widest text-yellow-400/80">
            {orphans.length} produit{orphans.length !== 1 ? "s" : ""} sans section valide
          </p>
          <div className="flex flex-col gap-1.5">
            {orphans.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-ivory/30 uppercase">{p.sku}</span>
                <span className="font-display text-sm text-ivory/70">{p.name}</span>
                <span className="font-mono text-[10px] text-yellow-400/60">section: &ldquo;{p.section || "(vide)"}&rdquo;</span>
              </div>
            ))}
          </div>
          <p className="font-mono text-[11px] text-ivory/30">
            Modifiez la section de ces produits depuis l&apos;onglet Produits.
          </p>
        </div>
      )}

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
