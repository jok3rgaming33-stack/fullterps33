import Link from "next/link"
import Image from "next/image"

export function Hero() {
  return (
    <section className="relative min-h-[80vh] md:min-h-screen w-full overflow-hidden border-b border-white/10 flex items-center">
      {/* Vidéo en arrière-plan plein écran */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover object-center z-0"
      >
        <source src="/images/bgvid.mp4" type="video/mp4" />
        Votre navigateur ne supporte pas les vidéos HTML5.
      </video>

      {/* Gradients de transition pour garantir la lisibilité du texte sur la vidéo */}
      <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-void/70 z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-void/80 via-transparent to-void/40 z-10 hidden md:block" />

      {/* Conteneur unique du contenu aligné proprement à gauche */}
      <div className="relative z-20 mx-auto w-full max-w-[1200px] px-6 py-12 md:py-24 flex flex-col justify-center">
        
        {/* Logo principal réactif (s'adapte automatiquement sur mobile et desktop) */}
        <div className="relative h-[70px] w-[240px] sm:w-[320px] md:h-[130px] md:w-[480px] mb-4 md:mb-6">
          <Image 
            src="/images/hero-logo.png" 
            alt="FULLTERPS33" 
            fill 
            className="object-contain object-left" 
            priority 
          />
        </div>

        {/* Bloc d'informations mis à jour avec les textes de la capture d'écran */}
        <div className="max-w-xl">
          <span className="mb-3 block font-mono text-xs uppercase tracking-[0.35em] text-violet-electric font-bold">
            "TON PLUG BORDELAIS DEPUIS 2021"
          </span>
          <p className="font-body text-sm md:text-base leading-relaxed text-ivory/80 drop-shadow-md">
            On te propose uniquement des produits de qualité aux meilleurs prix. Livraison rapide, meet-up.
          </p>

          {/* Boutons d'action mis à jour avec styles et filtres de flou modernes */}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="#capsule"
              className="clip-tag bg-violet-electric px-8 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-void shadow-glow transition hover:brightness-110 text-center min-w-[160px]"
            >
              "NOTRE MENU"
            </Link>
            <Link
              href="#nouveautes"
              className="border border-white/20 bg-void/40 backdrop-blur-sm px-8 py-3 font-mono text-xs uppercase tracking-[0.2em] text-ivory/80 transition hover:border-violet-electric hover:text-violet-electric text-center min-w-[160px]"
            >
              NOUVEAUTÉS
            </Link>
          </div>
        </div>

      </div>
    </section>
  )
}