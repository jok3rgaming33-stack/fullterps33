"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import type { Product } from "@/lib/types"

export interface Category {
  id: string
  name: string
  label: string
  productCount: number
}

export function AdminCategoriesPanel({ products }: { products: Product[] }) {
  const categories: Category[] = [
    {
      id: "capsule",
      name: "capsule",
      label: "Édition Capsule",
      productCount: products.filter((p) => p.category === "capsule").length,
    },
    {
      id: "nouveautes",
      name: "nouveautes",
      label: "Nouveautés",
      productCount: products.filter((p) => p.category === "nouveautes").length,
    },
  ]

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: "", label: "" })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Future: Implement category creation
    console.log("Creating category:", formData)
    setFormData({ name: "", label: "" })
    setShowForm(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg tracking-wide">Catégories actuelles</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 clip-tag bg-violet-electric px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.15em] text-void hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Nouvelle
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="clip-card border border-white/10 bg-surface p-4 space-y-3"
          >
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">
                Slug (ID)
              </span>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: special-edition"
                className="border border-white/15 bg-void px-3 py-2 text-sm outline-none focus:border-violet-electric"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ivory/50">
                Nom affiché
              </span>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData((f) => ({ ...f, label: e.target.value }))}
                placeholder="Ex: Édition Spéciale"
                className="border border-white/15 bg-void px-3 py-2 text-sm outline-none focus:border-violet-electric"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                className="clip-tag flex-1 bg-violet-electric py-2.5 font-mono text-xs font-bold uppercase tracking-[0.15em] text-void hover:brightness-110"
              >
                Créer
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="border border-white/20 px-4 font-mono text-xs uppercase tracking-wide text-ivory/70 hover:border-white/40"
              >
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="grid gap-2">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center justify-between border border-white/10 bg-surface px-4 py-3 hover:border-white/20"
          >
            <div className="flex-1">
              <p className="font-display text-sm tracking-wide">{cat.label}</p>
              <p className="font-mono text-[10px] uppercase text-ivory/40">{cat.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs text-ivory/60">
                {cat.productCount} produit{cat.productCount !== 1 ? "s" : ""}
              </span>
              <button className="text-ivory/50 hover:text-violet-electric transition-colors">
                ⚙️
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 pt-4">
        <p className="font-mono text-xs text-ivory/40">
          💡 Conseil: Organisez vos produits par catégorie pour une meilleure expérience utilisateur.
        </p>
      </div>
    </div>
  )
}
