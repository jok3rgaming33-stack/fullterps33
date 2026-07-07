'use client'

import { useState, useRef, useCallback } from 'react'
import { saveVerificationFile } from '@/app/actions/verification'

interface SelfieVerificationModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function SelfieVerificationModal({ onClose, onSuccess }: SelfieVerificationModalProps) {
  const [step, setStep] = useState<'intro' | 'photo' | 'video' | 'uploading'>('intro')
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [error, setError] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  // Démarrer la webcam
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      mediaStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      setError('Impossible d\'accéder à la caméra')
    }
  }, [])

  // Prendre une photo
  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        ctx.drawImage(videoRef.current, 0, 0)
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            setPhotoBlob(blob)
            setStep('video')
          }
        }, 'image/jpeg')
      }
    }
  }, [])

  // Enregistrer la vidéo (5-10s)
  const startVideoRecording = useCallback(async () => {
    if (!mediaStreamRef.current) return

    const chunks: BlobPart[] = []
    const mediaRecorder = new MediaRecorder(mediaStreamRef.current)

    mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/mp4' })
      setVideoBlob(blob)
      setStep('uploading')
    }

    mediaRecorderRef.current = mediaRecorder
    mediaRecorder.start()

    // Limite à 10 secondes
    setTimeout(() => {
      mediaRecorder.stop()
    }, 10000)
  }, [])

  // Upload fichiers
  const uploadFiles = useCallback(async () => {
    if (!photoBlob || !videoBlob) {
      setError('Photo et vidéo requises')
      return
    }

    try {
      // Upload photo
      const photoForm = new FormData()
      photoForm.append('file', photoBlob)
      photoForm.append('type', 'photo')
      const photoRes = await fetch('/api/verification/upload', {
        method: 'POST',
        body: photoForm,
      })
      if (!photoRes.ok) throw new Error('Upload photo échoué')
      const photoData = await photoRes.json()

      // Sauvegarder pathname
      await saveVerificationFile('photo', photoData.pathname)

      // Upload vidéo
      const videoForm = new FormData()
      videoForm.append('file', videoBlob)
      videoForm.append('type', 'video')
      const videoRes = await fetch('/api/verification/upload', {
        method: 'POST',
        body: videoForm,
      })
      if (!videoRes.ok) throw new Error('Upload vidéo échoué')
      const videoData = await videoRes.json()

      // Sauvegarder pathname
      await saveVerificationFile('video', videoData.pathname)

      // Cleanup
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload échoué')
      setStep('intro')
    }
  }, [photoBlob, videoBlob, onSuccess])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4">
      <div className="clip-card w-full max-w-lg border border-white/10 bg-surface p-8 space-y-6">
        <div>
          <h2 className="font-display text-xl tracking-wide">Vérification d&apos;identité</h2>
          <p className="mt-2 font-mono text-xs text-ivory/50">
            Selfie photo + vidéo courte (5-10s) requise pour votre première commande
          </p>
        </div>

        {error && (
          <div className="clip-card border border-orange-500/50 bg-orange-500/10 px-4 py-2 font-mono text-sm text-orange-300">
            {error}
          </div>
        )}

        {step === 'intro' && (
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <span className="text-violet-electric">✓</span> Photo nette de votre visage
              </p>
              <p className="flex items-center gap-2">
                <span className="text-violet-electric">✓</span> Vidéo courte (5-10s) parlant vers la caméra
              </p>
              <p className="flex items-center gap-2">
                <span className="text-violet-electric">✓</span> Bon éclairage, fond neutre
              </p>
            </div>
            <button
              onClick={() => {
                startCamera()
                setStep('photo')
              }}
              className="w-full clip-button bg-gradient-to-r from-violet-electric to-cyan-electric py-3 font-display tracking-wide uppercase text-void hover:opacity-90 transition"
            >
              Commencer
            </button>
            <button
              onClick={onClose}
              className="w-full border border-white/20 py-2 font-mono text-xs uppercase text-ivory/60 hover:bg-white/5 transition"
            >
              Fermer
            </button>
          </div>
        )}

        {step === 'photo' && !photoBlob && (
          <div className="space-y-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full border border-white/10 rounded-sm bg-black"
            />
            <canvas ref={canvasRef} className="hidden" />
            <button
              onClick={capturePhoto}
              className="w-full clip-button bg-gradient-to-r from-violet-electric to-cyan-electric py-3 font-display tracking-wide uppercase text-void hover:opacity-90 transition"
            >
              Prendre une photo
            </button>
          </div>
        )}

        {step === 'photo' && photoBlob && (
          <div className="space-y-4">
            <img
              src={URL.createObjectURL(photoBlob)}
              alt="Selfie"
              className="w-full border border-white/10 rounded-sm"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPhotoBlob(null)
                }}
                className="flex-1 border border-white/20 py-2 font-mono text-xs uppercase text-ivory/60 hover:bg-white/5 transition"
              >
                Reprendre
              </button>
              <button
                onClick={() => {
                  startCamera()
                  setStep('video')
                }}
                className="flex-1 clip-button bg-gradient-to-r from-violet-electric to-cyan-electric py-2 font-mono text-xs uppercase text-void hover:opacity-90 transition"
              >
                Suivant
              </button>
            </div>
          </div>
        )}

        {step === 'video' && !videoBlob && (
          <div className="space-y-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full border border-white/10 rounded-sm bg-black"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPhotoBlob(null)
                  setStep('photo')
                }}
                className="flex-1 border border-white/20 py-2 font-mono text-xs uppercase text-ivory/60 hover:bg-white/5 transition"
              >
                Retour
              </button>
              <button
                onClick={startVideoRecording}
                className="flex-1 clip-button bg-red-600/80 py-2 font-mono text-xs uppercase text-white hover:opacity-90 transition"
              >
                Enregistrer (10s max)
              </button>
            </div>
          </div>
        )}

        {step === 'uploading' && (
          <div className="space-y-4 text-center">
            <p className="font-mono text-sm text-ivory/70">Upload en cours...</p>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-electric to-cyan-electric animate-pulse" />
            </div>
            <button
              onClick={uploadFiles}
              disabled
              className="w-full clip-button bg-violet-electric/50 py-3 font-display tracking-wide uppercase text-void opacity-50 cursor-not-allowed"
            >
              Upload...
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
