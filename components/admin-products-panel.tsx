"use client"

import { useState, useRef, useTransition } from "react"
import { upload } from "@vercel/blob/client"
import {
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductInput,
} from "@/app/actions/products"
import { ALL_BADGE_KEYS, BADGES } from "@/lib/badges"
import type { Product, ProductVariant } from "@/lib/types"
import type { BadgeKey } from "@/lib/badges"
import {
  Plus, Trash2, Pencil, X, Upload, Loader2,
  Image as ImageIcon, GripVertical,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUSES: { value: Product["status"]; label: string }[] = [
  { value: "disponible", label: "Disponible" },
  { value: "rupture", label: "Rupture de stock" },
  { value: "bientot", label: "Bientôt dispo" },
  { value: "reappro", label: "En réappro" },
]

const SECTIONS = ["general", "capsule", "nouveautes", "exclusif"]

const DISCOUNT_TYPES = [
  { value: "", label: "Aucune réduction" },
  { value: "percent", label: "Pourcentage (%)" },
  { value: "fixed", label: "Montant fixe (€)" },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cents(euros: string) {
  return Math.round(parseFloat(euros || "0") * 100)
}

function euros(c: number) {
  return (c / 100).toFixed(2)
}

const ACCEPTED = "image/*,video/mp4,video/webm,video/quicktime"

async function uploadFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const blob = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
    onUploadProgress: ({ percentage }) => onProgress?.(percentage),
  })
  return blob.url
}

// ---------------------------------------------------------------------------
// MediaUploader — image ou vidéo unique
// ---------------------------------------------------------------------------

function MediaUploader({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const isVideo = value
    ? /\.(mp4|webm|mov|quicktime)(\?|$)/i.test(value) || value.includes("video")
    : false

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError("")
    setProgress(0)
    setUploading(true)
    try {
      const url = await uploadFile(file, setProgress)
      onChange(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur upload")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="label-admin">{label}</span>
      <div
        className="relative flex items-center justify-center border border-dashed border-zinc-700 rounded-lg h-32 cursor-pointer bg-zinc-900/50 hover:border-violet-500 transition-colors overflow-hidden"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {value ? (
          isVideo ? (
            <video src={value} className="h-full w-full object-cover" muted playsInline />
          ) : (
            <img src={value} alt="" className="h-full w-full object-cover" />
          )
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-zinc-600">
            <ImageIcon size={24} />
            <span className="text-xs">Image ou vidéo</span>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-zinc-900/80 flex flex-col items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin text-violet-400" />
            <div className="w-3/4 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-zinc-400">{progress}%</span>
          </div>
        )}

        {value && !uploading && (
          <button
            type="button"
            className="absolute top-1.5 right-1.5 bg-zinc-900/90 rounded p-1 text-zinc-400 hover:text-red-400 transition-colors"
            onClick={(e) => { e.stopPropagation(); onChange("") }}
            aria-label="Supprimer"
          >
            <X size={13} />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={handleFile}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MediaGallery — médias additionnels multiples
// ---------------------------------------------------------------------------

type UploadingItem = { name: string; progress: number }

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|quicktime)(\?|$)/i.test(url) || url.includes("video")
}

function MediaGallery({ media, onChange }: { media: string[]; onChange: (urls: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<UploadingItem[]>([])

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    // Initialise l'état de progression pour chaque fichier
    setUploading(files.map((f) => ({ name: f.name, progress: 0 })))

    const results = await Promise.allSettled(
      files.map((file, idx) =>
        uploadFile(file, (pct) =>
          setUploading((prev) =>
            prev.map((item, i) => (i === idx ? { ...item, progress: pct } : item))
          )
        )
      )
    )

    const newUrls = results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
      .map((r) => r.value)

    onChange([...media, ...newUrls])
    setUploading([])
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="label-admin">
          Médias additionnels
          {media.length > 0 && (
            <span className="ml-1.5 text-zinc-500">({media.length})</span>
          )}
        </span>
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
          onClick={() => inputRef.current?.click()}
          disabled={uploading.length > 0}
        >
          {uploading.length > 0 ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Upload size={12} />
          )}
          Ajouter
        </button>
      </div>

      {/* Fichiers en cours d'upload */}
      {uploading.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {uploading.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 truncate flex-1">{item.name}</span>
              <div className="w-24 h-1.5 bg-zinc-700 rounded-full overflow-hidden shrink-0">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-200"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-zinc-500 w-8 text-right shrink-0">
                {item.progress}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Grille des médias existants */}
      {media.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {media.map((url, i) => (
            <div key={i} className="relative w-16 h-16 rounded overflow-hidden border border-zinc-700 group">
              {isVideoUrl(url) ? (
                <video src={url} className="w-full h-full object-cover" muted playsInline />
              ) : (
                <img src={url} alt="" className="w-full h-full object-cover" />
              )}
              <button
                type="button"
                className="absolute inset-0 flex items-center justify-center bg-zinc-900/0 group-hover:bg-zinc-900/60 transition-colors"
                onClick={() => onChange(media.filter((_, idx) => idx !== i))}
                aria-label="Supprimer ce média"
              >
                <X size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="hidden"
        onChange={handleFiles}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// VariantsEditor
// ---------------------------------------------------------------------------

function VariantsEditor({ variants, onChange }: { variants: ProductVariant[]; onChange: (v: ProductVariant[]) => void }) {
  function add() {
    onChange([...variants, { qty: 0, price: 0, label: "" }])
  }
  function remove(i: number) {
    onChange(variants.filter((_, idx) => idx !== i))
  }
  function update(i: number, field: keyof ProductVariant, raw: string) {
    const next = [...variants]
    if (field === "price") next[i] = { ...next[i], price: cents(raw) }
    else if (field === "qty") next[i] = { ...next[i], qty: parseInt(raw) || 0 }
    else next[i] = { ...next[i], label: raw }
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="label-admin">Variantes de prix (qty → prix)</span>
        <button type="button" onClick={add} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300">
          <Plus size={12} /> Ajouter variante
        </button>
      </div>
      {variants.length === 0 && (
        <p className="text-xs text-zinc-600 italic">Aucune variante — le prix de base sera utilisé.</p>
      )}
      {variants.map((v, i) => (
        <div key={i} className="grid grid-cols-[80px_90px_1fr_auto] gap-2 items-center">
          <input
            type="number" min="0"
            placeholder="Qté (g)"
            value={v.qty || ""}
            onChange={(e) => update(i, "qty", e.target.value)}
            className="input-admin"
          />
          <input
            type="number" min="0" step="0.01"
            placeholder="Prix (€)"
            value={v.price ? euros(v.price) : ""}
            onChange={(e) => update(i, "price", e.target.value)}
            className="input-admin"
          />
          <input
            type="text"
            placeholder="Label (ex: 5g)"
            value={v.label ?? ""}
            onChange={(e) => update(i, "label", e.target.value)}
            className="input-admin"
          />
          <button type="button" onClick={() => remove(i)} className="text-red-500 hover:text-red-400 p-1">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ProductForm — création / édition
// ---------------------------------------------------------------------------

const EMPTY: ProductInput = {
  name: "", description: "", price: 0, category: "general",
  status: "disponible", badges: [], sizes: [], sku: "", stock: 0,
  image: "", media: [], variants: [], discount_type: null,
  discount_value: null, sort_order: 0, section: "general",
}

function ProductForm({ initial, onSave, onCancel }: { initial?: Product; onSave: () => void; onCancel: () => void }) {
  const [form, setForm] = useState<ProductInput>(
    initial ? {
      name: initial.name, description: initial.description ?? "",
      price: initial.price, category: initial.category, status: initial.status,
      badges: initial.badges, sizes: initial.sizes, sku: initial.sku,
      stock: initial.stock, image: initial.image ?? "", media: initial.media,
      variants: initial.variants, discount_type: initial.discount_type,
      discount_value: initial.discount_value, sort_order: initial.sort_order,
      section: initial.section,
    } : EMPTY
  )
  const [sizesInput, setSizesInput] = useState(initial?.sizes.join(", ") ?? "")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function set<K extends keyof ProductInput>(k: K, v: ProductInput[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function toggleBadge(key: BadgeKey) {
    const cur = form.badges ?? []
    set("badges", cur.includes(key) ? cur.filter((b) => b !== key) : [...cur, key])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const payload: ProductInput = {
      ...form,
      sizes: sizesInput.split(",").map((s) => s.trim()).filter(Boolean),
      image: form.image || null,
    }
    startTransition(async () => {
      const res = initial
        ? await updateProduct(initial.id, payload)
        : await createProduct(payload)
      if (res.ok) onSave()
      else setError(res.message ?? "Erreur")
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Nom + SKU */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="label-admin">Nom *</label>
          <input required className="input-admin" value={form.name}
            onChange={(e) => set("name", e.target.value)} placeholder="Ex: Gorilla Glue #4" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="label-admin">SKU</label>
          <input className="input-admin" value={form.sku ?? ""}
            onChange={(e) => set("sku", e.target.value)} placeholder="Généré auto si vide" />
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="label-admin">Description</label>
        <textarea className="input-admin min-h-[72px] resize-y" value={form.description ?? ""}
          onChange={(e) => set("description", e.target.value)} placeholder="Description du produit…" />
      </div>

      {/* Prix / Stock / Statut / Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1">
          <label className="label-admin">Prix de base (€)</label>
          <input type="number" step="0.01" min="0" className="input-admin"
            value={form.price ? euros(form.price) : ""}
            onChange={(e) => set("price", cents(e.target.value))} placeholder="0.00" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="label-admin">Stock</label>
          <input type="number" min="0" className="input-admin"
            value={form.stock ?? 0}
            onChange={(e) => set("stock", parseInt(e.target.value) || 0)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="label-admin">Statut</label>
          <select className="input-admin" value={form.status}
            onChange={(e) => set("status", e.target.value as Product["status"])}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="label-admin">Section</label>
          <select className="input-admin" value={form.section ?? "general"}
            onChange={(e) => set("section", e.target.value)}>
            {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Réduction */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="label-admin">Type de réduction</label>
          <select className="input-admin" value={form.discount_type ?? ""}
            onChange={(e) => set("discount_type", (e.target.value as "percent" | "fixed") || null)}>
            {DISCOUNT_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        {form.discount_type && (
          <div className="flex flex-col gap-1">
            <label className="label-admin">Valeur {form.discount_type === "percent" ? "(%)" : "(€)"}</label>
            <input type="number" min="0" className="input-admin"
              value={form.discount_value ?? ""}
              onChange={(e) => set("discount_value", parseFloat(e.target.value) || null)} />
          </div>
        )}
      </div>

      {/* Tailles */}
      <div className="flex flex-col gap-1">
        <label className="label-admin">Tailles / formats (séparés par virgule)</label>
        <input className="input-admin" value={sizesInput}
          onChange={(e) => setSizesInput(e.target.value)}
          placeholder="Ex: 1g, 3.5g, 7g, 14g, 28g" />
      </div>

      {/* Variantes */}
      <VariantsEditor variants={form.variants ?? []} onChange={(v) => set("variants", v)} />

      {/* Badges */}
      <div className="flex flex-col gap-2">
        <span className="label-admin">Badges</span>
        <div className="flex flex-wrap gap-2">
          {ALL_BADGE_KEYS.map((key) => {
            const b = BADGES[key]
            const active = (form.badges ?? []).includes(key)
            return (
              <button key={key} type="button" onClick={() => toggleBadge(key)}
                className={`px-2 py-0.5 text-xs rounded border font-mono tracking-wide transition-all ${
                  active
                    ? `${b.color} ${b.text} ${b.border} border`
                    : "bg-zinc-900 text-zinc-500 border-zinc-700 hover:border-zinc-500"
                }`}>
                {b.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Image principale + galerie */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MediaUploader label="Image principale" value={form.image ?? ""}
          onChange={(url) => set("image", url)} />
        <MediaGallery media={form.media ?? []} onChange={(urls) => set("media", urls)} />
      </div>

      {/* Ordre */}
      <div className="flex flex-col gap-1">
        <label className="label-admin">Ordre d&apos;affichage</label>
        <input type="number" min="0" className="input-admin w-28"
          value={form.sort_order ?? 0}
          onChange={(e) => set("sort_order", parseInt(e.target.value) || 0)} />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3 pt-1 border-t border-zinc-800">
        <button type="submit" disabled={pending}
          className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded transition-colors">
          {pending && <Loader2 size={14} className="animate-spin" />}
          {initial ? "Enregistrer les modifications" : "Créer le produit"}
        </button>
        <button type="button" onClick={onCancel}
          className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded transition-colors">
          Annuler
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// ProductRow
// ---------------------------------------------------------------------------

function ProductRow({ product, onEdit, onDeleted }: { product: Product; onEdit: () => void; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirming) { setConfirming(true); return }
    startTransition(async () => {
      await deleteProduct(product.id)
      onDeleted()
    })
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors">
      <GripVertical size={14} className="text-zinc-700 shrink-0" />
      <div className="w-11 h-11 shrink-0 rounded overflow-hidden bg-zinc-800 border border-zinc-700">
        {product.image
          ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-zinc-600"><ImageIcon size={14} /></div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-100 truncate">{product.name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-zinc-500">{euros(product.price)} €</span>
          <span className="text-zinc-700">·</span>
          <span className="text-xs text-zinc-500">Stock : {product.stock}</span>
          <span className="text-zinc-700">·</span>
          <span className={`text-xs ${product.status === "disponible" ? "text-emerald-400" : "text-amber-400"}`}>
            {product.status}
          </span>
          {(product.badges ?? []).slice(0, 2).map((b) => (
            <span key={b} className="text-xs bg-zinc-800 text-zinc-400 border border-zinc-700 rounded px-1">
              {BADGES[b]?.label ?? b}
            </span>
          ))}
          {(product.variants ?? []).length > 0 && (
            <span className="text-xs text-violet-400">{product.variants.length} variante{product.variants.length > 1 ? "s" : ""}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} className="p-1.5 text-zinc-500 hover:text-violet-400 transition-colors" title="Modifier">
          <Pencil size={14} />
        </button>
        <button onClick={handleDelete} disabled={pending}
          className={`p-1.5 transition-colors ${confirming ? "text-red-400" : "text-zinc-600 hover:text-red-400"}`}
          title={confirming ? "Cliquer pour confirmer" : "Supprimer"}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
        {confirming && (
          <button onClick={() => setConfirming(false)} className="p-1.5 text-zinc-600 hover:text-zinc-300">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AdminProductsPanel — composant principal
// ---------------------------------------------------------------------------

export function AdminProductsPanel({ products: initial }: { products: Product[] }) {
  const [products] = useState<Product[]>(initial)
  const [mode, setMode] = useState<"list" | "create" | "edit">("list")
  const [editing, setEditing] = useState<Product | undefined>()
  const [search, setSearch] = useState("")

  function startEdit(p: Product) {
    setEditing(p)
    setMode("edit")
  }

  function handleSaved() {
    setMode("list")
    setEditing(undefined)
    // revalidatePath déclenché côté serveur, la page se rafraîchit
    window.location.reload()
  }

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: products.length,
    disponibles: products.filter((p) => p.status === "disponible").length,
    rupture: products.filter((p) => p.status === "rupture").length,
    stockTotal: products.reduce((s, p) => s + (p.stock ?? 0), 0),
  }

  if (mode === "create" || mode === "edit") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
          <button onClick={() => { setMode("list"); setEditing(undefined) }}
            className="text-zinc-500 hover:text-zinc-200 transition-colors">
            <X size={18} />
          </button>
          <h2 className="text-base font-semibold text-zinc-100">
            {mode === "create" ? "Nouveau produit" : `Modifier : ${editing?.name}`}
          </h2>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5">
          <ProductForm initial={editing} onSave={handleSaved}
            onCancel={() => { setMode("list"); setEditing(undefined) }} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total produits", value: stats.total },
          { label: "Disponibles", value: stats.disponibles },
          { label: "Rupture", value: stats.rupture },
          { label: "Stock total", value: stats.stockTotal },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">{kpi.label}</p>
            <p className="text-xl font-bold text-zinc-100 mt-0.5">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Barre d'actions */}
      <div className="flex items-center gap-3">
        <input type="search" placeholder="Rechercher (nom, SKU, catégorie)…"
          className="input-admin flex-1 max-w-sm"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className="text-xs text-zinc-600 hidden md:block">
          {filtered.length} / {products.length}
        </span>
        <button onClick={() => setMode("create")}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded transition-colors shrink-0">
          <Plus size={15} /> Nouveau produit
        </button>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-zinc-600">
          <ImageIcon size={36} />
          <p className="text-sm">{search ? "Aucun produit correspondant" : "Aucun produit — crée le premier"}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((p) => (
            <ProductRow key={p.id} product={p}
              onEdit={() => startEdit(p)}
              onDeleted={() => window.location.reload()} />
          ))}
        </div>
      )}
    </div>
  )
}
