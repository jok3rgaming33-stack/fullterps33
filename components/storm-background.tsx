/**
 * Fond d'orage violet sombre (dégradés + nuages en bruit SVG). Aucune image externe.
 */
export function StormBackground({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`storm-bg pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <svg className="storm-clouds absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <filter id="storm-cloud-noise" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.0045 0.009" numOctaves="4" seed="33" />
          <feColorMatrix
            values="0 0 0 0 0.42
                    0 0 0 0 0.18
                    0 0 0 0 0.75
                    0 0 0 1.8 -0.62"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#storm-cloud-noise)" />
      </svg>
      <div className="storm-grain absolute inset-0" />
    </div>
  )
}
