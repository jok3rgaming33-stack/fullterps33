'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-void text-ivory flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h2 className="font-display text-2xl mb-4">Une erreur s'est produite</h2>
        <p className="text-ivory/60 mb-6">{error.message || 'Erreur lors du chargement de la page'}</p>
        <button
          onClick={() => reset()}
          className="bg-violet-electric px-6 py-2 text-sm font-mono uppercase tracking-wider"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
