import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-void">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-12 md:flex-row md:justify-between">
        <div>
          <span className="font-display text-lg tracking-wide">
            FULLTERPS<span className="text-violet-electric">33</span>
          </span>
          <p className="mt-2 max-w-xs font-mono text-xs text-ivory/40">
            Que de la foudre la famille.
          </p>
        </div>

        <div className="flex gap-12">
          <div className="flex flex-col gap-2 font-mono text-xs uppercase tracking-widest text-ivory/60">
            <span className="mb-1 text-ivory/30">Boutique</span>
            <Link href="/#capsule" className="hover:text-violet-electric">Nos produits</Link>
            <Link href="/#nouveautes" className="hover:text-violet-electric">Nouveautés</Link>
          </div>
          <div className="flex flex-col gap-2 font-mono text-xs uppercase tracking-widest text-ivory/60">
            <span className="mb-1 text-ivory/30">Compte</span>
            <Link href="/compte" className="hover:text-violet-electric">Mon Compte</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/5 px-4 py-4 text-center font-mono text-[10px] uppercase tracking-widest text-ivory/30">
        © {new Date().getFullYear()} HEISENWEB — Tous droits réservés
      </div>
    </footer>
  )
}
