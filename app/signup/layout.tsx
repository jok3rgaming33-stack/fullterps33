export const dynamic = "force-dynamic"

export const metadata = {
  title: 'Créer un compte | FULLTERPS33',
  description: 'Crée ton compte FULLTERPS33 en un clic avec un TOKEN unique',
}

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-void">
      {/* Fond vidéo identique à la page principale */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
      >
        <source src="/images/bgvid.mp4" type="video/mp4" />
      </video>
      {/* Overlay sombre pour lisibilité */}
      <div className="pointer-events-none absolute inset-0 bg-void/60" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
