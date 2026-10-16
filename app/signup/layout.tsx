export const dynamic = "force-dynamic"

export const metadata = {
  title: 'Créer un compte | BRUMÉCO',
  description: 'Crée ton compte BRUMÉCO. Vente d\'e-liquides réservée aux 18 ans et plus.',
}

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-void">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: "url(/images/hero-still.jpg)" }}
      />
      {/* Overlay sombre pour lisibilité */}
      <div className="pointer-events-none absolute inset-0 bg-void/60" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
