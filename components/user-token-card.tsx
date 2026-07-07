'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function UserTokenCard({ pseudo, token }: { pseudo: string; token: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="border border-white/10 bg-surface/50 backdrop-blur-sm rounded-lg p-6 max-w-md">
      <div className="mb-4">
        <p className="font-mono text-xs text-ivory/50 uppercase tracking-widest mb-2">Ton pseudo</p>
        <p className="font-display text-2xl tracking-wider text-violet-electric">{pseudo}</p>
      </div>

      <div className="mb-6">
        <p className="font-mono text-xs text-ivory/50 uppercase tracking-widest mb-2">Clé d'accès (TOKEN)</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 break-all font-mono text-xs bg-void p-3 border border-white/10 rounded text-ivory/80">
            {token}
          </code>
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-violet-electric/20 rounded transition"
          >
            {copied ? (
              <Check className="w-4 h-4 text-violet-electric" />
            ) : (
              <Copy className="w-4 h-4 text-ivory/50 hover:text-ivory" />
            )}
          </button>
        </div>
      </div>

      <div className="bg-signal/10 border border-signal/30 rounded p-4 mb-4">
        <p className="font-mono text-xs text-signal mb-2">IMPORTANT</p>
        <ul className="font-mono text-xs text-ivory/70 space-y-1 list-disc list-inside">
          <li>Sauvegarde ce TOKEN, c'est ta clé d'accès</li>
          <li>Tu auras besoin pour te reconnecter</li>
          <li>Ne le partage pas avec d'autres</li>
          <li>1 inscription par IP par mois</li>
        </ul>
      </div>

      <button
        onClick={() => {
          navigator.clipboard.writeText(token)
          alert('TOKEN copié!')
        }}
        className="w-full clip-tag bg-gradient-to-r from-violet-electric to-violet-soft py-2 font-mono text-xs font-bold uppercase tracking-widest text-void hover:brightness-110 transition"
      >
        Copier le TOKEN
      </button>
    </div>
  )
}
