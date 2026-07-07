"use client"

import { useState, useTransition } from "react"
import { validateVerification, rejectVerification } from "@/app/actions/verification"
import type { VerificationRow } from "@/app/actions/verification"
import { CheckCircle, XCircle, Camera, Video } from "lucide-react"

interface Props {
  initial: VerificationRow[]
}

export function AdminVerificationsPanel({ initial }: Props) {
  const [items, setItems] = useState<VerificationRow[]>(initial)
  const [selected, setSelected] = useState<VerificationRow | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [showReject, setShowReject] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function fb(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  function handleValidate(row: VerificationRow) {
    startTransition(async () => {
      const r = await validateVerification(row.user_token)
      if (r.ok) {
        setItems(prev => prev.filter(x => x.user_token !== row.user_token))
        setSelected(null)
        fb("KYC validé — client débloqué")
      } else {
        fb(r.error ?? "Erreur")
      }
    })
  }

  function handleReject(row: VerificationRow) {
    if (!rejectReason.trim()) return
    startTransition(async () => {
      const r = await rejectVerification(row.user_token, rejectReason)
      if (r.ok) {
        setItems(prev => prev.filter(x => x.user_token !== row.user_token))
        setSelected(null)
        setRejectReason("")
        setShowReject(false)
        fb("KYC rejeté")
      } else {
        fb(r.error ?? "Erreur")
      }
    })
  }

  if (items.length === 0) {
    return (
      <div className="border border-white/10 bg-surface/40 p-10 text-center">
        <CheckCircle className="mx-auto mb-3 h-8 w-8 text-violet-electric/30" />
        <p className="font-mono text-sm text-ivory/40">Aucune vérification en attente</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      {/* Liste */}
      <div className="w-full shrink-0 space-y-2 md:w-60">
        {feedback && (
          <div className="border border-violet-electric/30 bg-violet-electric/10 px-3 py-2 font-mono text-xs text-violet-electric">
            {feedback}
          </div>
        )}
        {items.map(row => (
          <button
            key={row.id}
            onClick={() => { setSelected(row); setShowReject(false); setRejectReason("") }}
            className={`w-full border p-3 text-left transition ${
              selected?.id === row.id
                ? "border-violet-electric/50 bg-violet-electric/10"
                : "border-white/10 bg-surface/40 hover:bg-surface/70"
            }`}
          >
            <p className="font-display text-sm text-ivory">{row.pseudo}</p>
            <p className="font-mono text-[10px] text-ivory/40">
              {new Date(row.created_at).toLocaleDateString("fr-FR")}
            </p>
            <div className="mt-1.5 flex gap-2">
              {row.photo_pathname && (
                <span className="flex items-center gap-1 font-mono text-[9px] text-ivory/40">
                  <Camera className="h-2.5 w-2.5" /> Photo
                </span>
              )}
              {row.video_pathname && (
                <span className="flex items-center gap-1 font-mono text-[9px] text-ivory/40">
                  <Video className="h-2.5 w-2.5" /> Vidéo
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Détail */}
      {selected ? (
        <div className="flex-1 border border-white/10 bg-surface/40 p-5 space-y-5">
          <div>
            <p className="font-display text-lg">{selected.pseudo}</p>
            <p className="font-mono text-[10px] text-ivory/40">
              Soumis le {new Date(selected.created_at).toLocaleDateString("fr-FR")}
            </p>
          </div>

          {/* Médias — stockés en Blob privé, affichage via note */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`flex h-28 items-center justify-center border ${selected.photo_pathname ? "border-green-400/20 bg-green-400/5" : "border-white/10 bg-void/40"}`}>
              <div className="text-center">
                <Camera className={`mx-auto h-5 w-5 mb-1 ${selected.photo_pathname ? "text-green-400/60" : "text-ivory/20"}`} />
                <p className="font-mono text-[9px] text-ivory/40">
                  {selected.photo_pathname ? "Selfie reçu" : "Pas de photo"}
                </p>
              </div>
            </div>
            <div className={`flex h-28 items-center justify-center border ${selected.video_pathname ? "border-green-400/20 bg-green-400/5" : "border-white/10 bg-void/40"}`}>
              <div className="text-center">
                <Video className={`mx-auto h-5 w-5 mb-1 ${selected.video_pathname ? "text-green-400/60" : "text-ivory/20"}`} />
                <p className="font-mono text-[9px] text-ivory/40">
                  {selected.video_pathname ? "Vidéo reçue" : "Pas de vidéo"}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          {!showReject ? (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleValidate(selected)}
                disabled={isPending}
                className="flex items-center gap-2 border border-green-400/30 bg-green-400/10 px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-green-400 transition hover:bg-green-400/20 disabled:opacity-40"
              >
                <CheckCircle className="h-3.5 w-3.5" /> Valider
              </button>
              <button
                onClick={() => setShowReject(true)}
                className="flex items-center gap-2 border border-signal/30 bg-signal/10 px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-signal transition hover:bg-signal/20"
              >
                <XCircle className="h-3.5 w-3.5" /> Rejeter
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Motif du rejet (obligatoire)…"
                rows={2}
                className="w-full resize-none border border-white/10 bg-void px-3 py-2 font-mono text-sm text-ivory outline-none focus:border-signal/50"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleReject(selected)}
                  disabled={isPending || !rejectReason.trim()}
                  className="border border-signal/30 bg-signal/10 px-5 py-2 font-mono text-xs uppercase tracking-widest text-signal transition hover:bg-signal/20 disabled:opacity-40"
                >
                  Confirmer
                </button>
                <button
                  onClick={() => setShowReject(false)}
                  className="border border-white/10 px-4 py-2 font-mono text-xs text-ivory/40 transition hover:text-ivory"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center border border-white/10 bg-surface/20 py-10">
          <p className="font-mono text-sm text-ivory/30">Sélectionner un dossier</p>
        </div>
      )}
    </div>
  )
}
