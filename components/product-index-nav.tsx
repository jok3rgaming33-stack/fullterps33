"use client"

import { useEffect, useState } from "react"
import { List, X } from "lucide-react"

export type IndexEntry = {
  id: string
  title: string
  sectionTitle: string
  featured: boolean
}

function CatalogList({
  entries,
  activeId,
  onPick,
}: {
  entries: IndexEntry[]
  activeId: string | null
  onPick: (id: string) => void
}) {
  let lastSection = ""
  return (
    <nav aria-label="Index catalogue" className="flex flex-col">
      <p className="mb-2 px-1 font-mono text-[10px] uppercase tracking-[0.22em] text-violet-electric">Catalogue</p>
      <ul className="flex flex-col">
        {entries.map((entry) => {
          const showSection = entry.sectionTitle !== lastSection
          if (showSection) lastSection = entry.sectionTitle
          const active = entry.id === activeId
          return (
            <li key={entry.id}>
              {showSection && (
                <p className="mb-1 mt-3 px-2 font-mono text-[9px] uppercase tracking-widest text-ivory/30 first:mt-0">
                  {entry.sectionTitle}
                </p>
              )}
              <button
                type="button"
                onClick={() => onPick(entry.id)}
                className={`flex w-full items-start gap-2 px-2 py-1.5 text-left ${active ? "text-ivory" : "text-ivory/50 hover:text-ivory/80"}`}
              >
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${entry.featured ? "bg-violet-electric" : active ? "bg-ivory/70" : "bg-white/20"}`}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className={`block truncate font-mono text-[11px] ${active ? "text-ivory" : ""}`}>{entry.title}</span>
                  {entry.featured && (
                    <span className="font-mono text-[8px] uppercase tracking-widest text-violet-electric/80">En avant</span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function ProductIndexNav({ entries }: { entries: IndexEntry[] }) {
  const [activeId, setActiveId] = useState<string | null>(entries[0]?.id ?? null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onActive = (event: Event) => {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id
      if (id && entries.some((entry) => entry.id === id)) setActiveId(id)
    }
    window.addEventListener("ft33:active-product", onActive)
    return () => window.removeEventListener("ft33:active-product", onActive)
  }, [entries])

  if (!entries.length) return null

  const pick = (id: string) => {
    setActiveId(id)
    setOpen(false)
    window.dispatchEvent(new CustomEvent("ft33:focus-product", { detail: { id } }))
  }

  return (
    <>
      <aside className="sticky top-20 hidden h-[calc(100vh-6rem)] w-56 shrink-0 overflow-y-auto py-12 pr-4 xl:block">
        <CatalogList entries={entries} activeId={activeId} onPick={pick} />
      </aside>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-4 z-30 flex items-center gap-2 border border-white/15 bg-void/90 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-ivory/80 backdrop-blur xl:hidden"
      >
        <List className="h-3.5 w-3.5 text-violet-electric" />
        Index
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] xl:hidden">
          <button type="button" className="absolute inset-0 bg-void/70" aria-label="Fermer l'index" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-3 bottom-3 max-h-[70vh] overflow-y-auto border border-white/10 bg-surface p-4">
            <div className="mb-2 flex justify-end">
              <button type="button" onClick={() => setOpen(false)} className="text-ivory/50" aria-label="Fermer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <CatalogList entries={entries} activeId={activeId} onPick={pick} />
          </div>
        </div>
      )}
    </>
  )
}
