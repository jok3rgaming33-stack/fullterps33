"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Pencil } from "lucide-react"
import type { Product, StockStatus } from "@/lib/types"
import { createProduct, deleteProduct } from "@/app/actions/products"
import { formatPrice } from "@/lib/utils"

const STATUS_OPTIONS: { value: StockStatus; label: string }[] = [
  { value: "disponible", label: "Disponible" },
  { value: "rupture", label: "Rupture de stock" },
  { value: "bientot", label: "Bientôt dispo" },
  { value: "reappro", label: "En réappro" },
]

const BADGE_OPTIONS = ["Aucun", "Best-seller", "Rupture de stock", "Bientôt dispo", "En réappro"] as const

const emptyForm = {
  id: "",
  name: "",
  price: "",
  category: "capsule" as Product["category"],
  status: "disponible" as StockStatus,
  badge: "Aucun" as (typeof BADGE_OPTIONS)[number],
  sizes: "S, M, L, XL",
  sku: "",
  image: "",
}

export function AdminProductsPanel({ products }: { products: Product[] }) {
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function startEdit(p: Product) {
    setEditingId(p.id)
    setForm({
      id: p.id,
      name: p.name,
      price: String(p.price),
      category: p.category,
      status: p.status,
      badge: (p.badge as (typeof BADGE_OPTIONS)[number]) ?? "Aucun",
      sizes: p.sizes.join(", "),
      sku: p.sku,
      image: p.image,
    })
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const price = parseInt(form.price, 10)
    if (!form.name.trim() || Number.isNaN(price)) {
      setError("Nom et prix valides requis")
      return
    }
    startTransition(async () => {
      await createProduct({
        id: editingId ?? undefined,
        name: form.name.trim(),
        price,
        category: form.category,
        status: form.status,
        badge: form.badge === "Aucun" ? null : (form.badge as Product["badge"]),
        sizes: form.sizes.split(",").map((s) => s.trim()).filter(Boolean),
        sku: form.sku.trim() || `FT33-${Date.now()}`,
        image: form.image.trim() || "produit",
      })
      resetForm()
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteProduct(id)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_1.4fr]">
      <form onSubmit={handleSubmit} className="clip-card flex flex-col gap-3 border border-white/10 bg-surface p-5">
        <h3 className="font-display text-lg tracking-wide">
          {editingId ? "Modifier le produit" : "Ajouter un produit"}
        </h3>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">Nom</span>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="border border-white/15 bg-void px-3 py-2 text-sm outline-none focus:border-violet-electric"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">Prix (€)</span>
            <input
              type="number"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="border border-white/15 bg-void px-3 py-2 text-sm outline-none focus:border-violet-electric"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">SKU</span>
            <input
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              placeholder="auto"
              className="border border-white/15 bg-void px-3 py-2 text-sm outline-none focus:border-violet-electric"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">Catégorie</span>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Product["category"] }))}
              className="border border-white/15 bg-void px-3 py-2 text-sm outline-none focus:border-violet-electric"
            >
              <option value="capsule">Édition Capsule</option>
              <option value="nouveautes">Nouveautés</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">Statut</span>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as StockStatus }))}
              className="border border-white/15 bg-void px-3 py-2 text-sm outline-none focus:border-violet-electric"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">Badge</span>
          <select
            value={form.badge}
            onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value as (typeof BADGE_OPTIONS)[number] }))}
            className="border border-white/15 bg-void px-3 py-2 text-sm outline-none focus:border-violet-electric"
          >
            {BADGE_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">
            Tailles (séparées par virgule)
          </span>
          <input
            value={form.sizes}
            onChange={(e) => setForm((f) => ({ ...f, sizes: e.target.value }))}
            className="border border-white/15 bg-void px-3 py-2 text-sm outline-none focus:border-violet-electric"
          />
        </label>

        {error && <p className="font-mono text-[11px] text-signal">{error}</p>}

        <div className="mt-2 flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="clip-tag flex-1 bg-violet-electric py-2.5 font-mono text-xs font-bold uppercase tracking-[0.15em] text-void hover:brightness-110 disabled:opacity-60"
          >
            {pending ? "…" : editingId ? "Enregistrer" : "Ajouter"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="border border-white/20 px-4 font-mono text-xs uppercase tracking-wide text-ivory/70 hover:border-white/40"
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      <div className="flex flex-col gap-2">
        {products.length === 0 && (
          <p className="font-mono text-sm text-ivory/40">Aucun produit. Ajoutez-en un.</p>
        )}
        {products.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between border border-white/10 bg-surface px-4 py-3"
          >
            <div>
              <p className="font-display text-sm tracking-wide">{p.name}</p>
              <p className="font-mono text-[10px] uppercase text-ivory/40">
                {p.sku} · {p.category === "capsule" ? "Édition Capsule" : "Nouveautés"} · {p.status}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold">{formatPrice(p.price)}</span>
              <button onClick={() => startEdit(p)} aria-label="Modifier" className="text-ivory/50 hover:text-violet-electric">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(p.id)} aria-label="Supprimer" className="text-ivory/50 hover:text-signal">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
