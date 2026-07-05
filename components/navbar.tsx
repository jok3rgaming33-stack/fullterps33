"use client"

import Link from "next/link"
import { ShoppingBag, Menu, X } from "lucide-react"
import { useState } from "react"
import { useCart } from "@/components/cart-provider"

const links = [
  { href: "/#capsule", label: "Édition Capsule" },
  { href: "/#nouveautes", label: "Nouveautés" },
  { href: "/compte", label: "Mon Compte" },
]

export function Navbar() {
  const { totalCount, openCart } = useCart()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-void/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-violet-electric/50 bg-surface">
            <svg width="18" height="24" viewBox="0 0 46 64" fill="none">
              <path d="M28 0L4 34H20L14 64L42 26H24L28 0Z" fill="#B355FF" />
            </svg>
          </span>
          <span className="font-display text-lg tracking-wide text-ivory">
            FULLTERPS<span className="text-violet-electric">33</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-mono text-xs uppercase tracking-[0.2em] text-ivory/70 transition hover:text-violet-electric"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            onClick={openCart}
            className="relative flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-ivory/80 transition hover:text-violet-electric"
            aria-label="Ouvrir le panier"
          >
            <ShoppingBag className="h-5 w-5" />
            <span className="hidden sm:inline">Panier</span>
            {totalCount > 0 && (
              <span className="absolute -right-3 -top-2 grid h-5 w-5 place-items-center rounded-full bg-violet-electric text-[10px] font-bold text-void">
                {totalCount}
              </span>
            )}
          </button>
          <button
            className="md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Ouvrir le menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="flex flex-col gap-1 border-t border-white/10 bg-void px-4 py-3 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="py-2 font-mono text-xs uppercase tracking-[0.2em] text-ivory/70"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
