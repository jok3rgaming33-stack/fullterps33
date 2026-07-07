'use client'

import { useState, useEffect } from 'react'
import { listPendingVerifications, validateVerification, rejectVerification } from '@/app/actions/verification'
import { get } from '@vercel/blob'

interface PendingVerification {
  id: string
  user_token: string
  pseudo: string
  photo_pathname: string | null
  video_pathname: string | null
  created_at: string
  status: string
}

export function AdminVerificationsPanel() {
  const [verifications, setVerifications] = useState<PendingVerification[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadVerifications()
  }, [])

  const loadVerifications = async () => {
    const result = await listPendingVerifications()
    setVerifications(result || [])
    setLoading(false)
  }

  const loadMedia = async (id: string, photo: string | null, video: string | null) => {
    setSelectedId(id)
    setPhotoUrl(null)
    setVideoUrl(null)

    if (photo) {
      try {
        const blob = await get(photo, { access: 'private' })
        const fileBlob = blob as unknown as { blob: Blob }
        setPhotoUrl(URL.createObjectURL(fileBlob.blob))
      } catch {
        setPhotoUrl(null)
      }
    }

    if (video) {
      try {
        const blob = await get(video, { access: 'private' })
        const fileBlob = blob as unknown as { blob: Blob }
        setVideoUrl(URL.createObjectURL(fileBlob.blob))
      } catch {
        setVideoUrl(null)
      }
    }
  }

  const handleValidate = async () => {
    if (!selectedId) return
    setProcessing(true)

    const userToken = verifications.find((v) => v.id === selectedId)?.user_token
    if (userToken) {
      await validateVerification(userToken)
      await loadVerifications()
      setSelectedId(null)
    }

    setProcessing(false)
  }

  const handleReject = async () => {
    if (!selectedId || !rejectReason.trim()) return
    setProcessing(true)

    const userToken = verifications.find((v) => v.id === selectedId)?.user_token
    if (userToken) {
      await rejectVerification(userToken, rejectReason)
      await loadVerifications()
      setSelectedId(null)
      setRejectReason('')
    }

    setProcessing(false)
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="font-mono text-sm text-ivory/50">Chargement...</p>
      </div>
    )
  }

  if (verifications.length === 0) {
    return (
      <div className="clip-card border border-white/10 bg-surface/50 p-8 text-center">
        <p className="font-mono text-sm text-ivory/50">Aucune vérification en attente</p>
      </div>
    )
  }

  const selected = verifications.find((v) => v.id === selectedId)

  return (
    <div className="space-y-6">
      <div className="grid gap-3">
        {verifications.map((v) => (
          <div
            key={v.id}
            onClick={() => loadMedia(v.id, v.photo_pathname, v.video_pathname)}
            className={`clip-card cursor-pointer border transition ${
              selectedId === v.id ? 'border-violet-electric bg-surface' : 'border-white/10 bg-surface/50 hover:bg-surface'
            } p-4`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display tracking-wide text-violet-electric">{v.pseudo}</p>
                <p className="font-mono text-xs text-ivory/40">
                  {new Date(v.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="text-right text-xs">
                {v.photo_pathname && <p className="text-green-400">✓ Photo</p>}
                {v.video_pathname && <p className="text-green-400">✓ Vidéo</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedId && selected && (
        <div className="clip-card border border-white/10 bg-surface p-6 space-y-4">
          <h3 className="font-display tracking-wide">Vérification : {selected.pseudo}</h3>

          {photoUrl && (
            <div>
              <p className="mb-2 font-mono text-xs text-ivory/50">Photo</p>
              <img src={photoUrl} alt="Selfie" className="w-full max-h-64 object-cover border border-white/10" />
            </div>
          )}

          {videoUrl && (
            <div>
              <p className="mb-2 font-mono text-xs text-ivory/50">Vidéo</p>
              <video
                src={videoUrl}
                controls
                className="w-full max-h-64 object-cover border border-white/10"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="block font-mono text-xs text-ivory/50">
              Motif de rejet (optionnel)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Selfie flou, impossibilité de vérifier l'identité..."
              className="w-full bg-void/50 border border-white/10 rounded px-3 py-2 font-mono text-sm text-ivory placeholder-ivory/30 focus:border-violet-electric outline-none"
              rows={2}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleValidate}
              disabled={processing}
              className="flex-1 clip-button bg-green-600/80 py-2 font-mono text-xs uppercase text-white hover:opacity-90 transition disabled:opacity-50"
            >
              ✓ Valider
            </button>
            <button
              onClick={handleReject}
              disabled={processing || !rejectReason.trim()}
              className="flex-1 clip-button bg-orange-600/80 py-2 font-mono text-xs uppercase text-white hover:opacity-90 transition disabled:opacity-50"
            >
              ✗ Rejeter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
