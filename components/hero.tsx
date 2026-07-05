import Link from "next/link"

export function Hero() {
  return (
    <section className="grain relative overflow-hidden border-b border-white/10">
      {/* Ambient violet storm glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 20%, rgba(179,85,255,0.22), transparent 60%), radial-gradient(50% 40% at 85% 70%, rgba(91,31,184,0.28), transparent 60%), #07060B",
        }}
      />
      {/* Faint bolt silhouettes */}
      <svg
        className="pointer-events-none absolute -right-10 top-10 h-[420px] w-[420px] opacity-[0.07] md:h-[560px] md:w-[560px]"
        viewBox="0 0 46 64"
        fill="none"
      >
        <path d="M28 0L4 34H20L14 64L42 26H24L28 0Z" fill="#B355FF" />
      </svg>

      <div className="relative mx-auto flex max-w-[1200px] flex-col items-start px-4 py-20 md:py-28">
        <span className="mb-4 font-mono text-xs uppercase tracking-[0.35em] text-violet-electric">
          Édition Capsule — Automne
        </span>

        <h1 className="font-display text-[15vw] leading-[0.85] tracking-tight text-ivory text-glow md:text-[7.5rem]">
          FULLTERPS<span className="text-violet-electric">33</span>
        </h1>

        <p className="mt-6 max-w-xl font-body text-base leading-relaxed text-ivory/70 md:text-lg">
          Coupes larges, matières lourdes, silhouette orage. Le streetwear pensé pour la
          rue, la nuit, et ce qui gronde au-dessus.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="#capsule"
            className="clip-tag bg-violet-electric px-8 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-void shadow-glow transition hover:brightness-110"
          >
            Voir la collection
          </Link>
          <Link
            href="#nouveautes"
            className="border border-white/20 px-8 py-3 font-mono text-xs uppercase tracking-[0.2em] text-ivory/80 transition hover:border-violet-electric hover:text-violet-electric"
          >
            Nouveautés
          </Link>
        </div>
      </div>
    </section>
  )
}
