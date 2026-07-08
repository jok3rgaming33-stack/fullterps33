"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  ShieldCheck, Camera, RefreshCw, Video, Square,
  Check, Loader2, AlertTriangle, CircleDot, X,
} from "lucide-react"

export type VerificationMetadata = { recordedAt: string }

type Props = {
  onComplete: (photoFile: File, videoFile: File, metadata: VerificationMetadata) => Promise<void> | void
  onCancel?: () => void
  submitting?: boolean
  submitError?: string | null
}

const MIN_SECONDS = 4
const MAX_SECONDS = 10

function nowLabel() {
  return new Date().toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

export function SelfieVerificationModal({ onComplete, onCancel, submitting = false, submitError = null }: Props) {
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoUrl,  setPhotoUrl]  = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl,  setVideoUrl]  = useState<string | null>(null)

  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [recording,   setRecording]   = useState(false)
  const [seconds,     setSeconds]     = useState(0)
  const [recordedAt,  setRecordedAt]  = useState("")

  const [mathA]      = useState(() => Math.floor(Math.random() * 6) + 4)
  const [mathB]      = useState(() => Math.floor(Math.random() * 4) + 2)
  const [mathAnswer, setMathAnswer] = useState("")
  const [confirmed,  setConfirmed]  = useState(false)

  const streamRef    = useRef<MediaStream | null>(null)
  const liveVideoRef = useRef<HTMLVideoElement | null>(null)
  const recorderRef  = useRef<MediaRecorder | null>(null)
  const chunksRef    = useRef<BlobPart[]>([])
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)

  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })
      streamRef.current = stream
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream
        await liveVideoRef.current.play().catch(() => {})
      }
      setCameraReady(true)
    } catch {
      setCameraError(
        "Impossible d'accéder à la caméra. Autorise l'accès caméra/micro dans les paramètres du navigateur."
      )
      setCameraReady(false)
    }
  }, [])

  useEffect(() => {
    startCamera()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [startCamera])

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl)
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [photoUrl, videoUrl])

  // ── Photo ──────────────────────────────────────────────────────────────────
  const capturePhoto = () => {
    const video = liveVideoRef.current
    if (!video || !cameraReady) return
    const canvas = document.createElement("canvas")
    canvas.width  = video.videoWidth  || 720
    canvas.height = video.videoHeight || 960
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], "selfie-photo.jpg", { type: "image/jpeg" })
        if (photoUrl) URL.revokeObjectURL(photoUrl)
        setPhotoFile(file)
        setPhotoUrl(URL.createObjectURL(file))
      },
      "image/jpeg",
      0.9,
    )
  }

  const onPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (photoUrl) URL.revokeObjectURL(photoUrl)
    setPhotoFile(file)
    setPhotoUrl(URL.createObjectURL(file))
  }

  const retakePhoto = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl)
    setPhotoFile(null)
    setPhotoUrl(null)
  }

  // ── Vidéo ──────────────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    const recorder = recorderRef.current
    if (recorder && recorder.state !== "inactive") recorder.stop()
    setRecording(false)
  }, [])

  const startRecording = () => {
    const stream = streamRef.current
    if (!stream || recording) return
    chunksRef.current = []
    const mime =
      typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : ""
    let recorder: MediaRecorder
    try {
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    } catch {
      setCameraError("L'enregistrement vidéo n'est pas supporté sur ce navigateur.")
      return
    }
    recorderRef.current = recorder
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" })
      const file = new File([blob], "selfie-video.webm", { type: "video/webm" })
      if (videoUrl) URL.revokeObjectURL(videoUrl)
      setVideoFile(file)
      setVideoUrl(URL.createObjectURL(file))
      setRecordedAt(nowLabel())
    }
    recorder.start()
    setRecording(true)
    setSeconds(0)
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1
        if (next >= MAX_SECONDS) stopRecording()
        return next
      })
    }, 1000)
  }

  const retakeVideo = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoFile(null)
    setVideoUrl(null)
    setSeconds(0)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const mathOk    = mathAnswer.trim() !== "" && Number(mathAnswer) === mathA + mathB
  const canSubmit = !!photoFile && !!videoFile && mathOk && confirmed && !submitting

  const handleSubmit = async () => {
    if (!canSubmit || !photoFile || !videoFile) return
    await onComplete(photoFile, videoFile, { recordedAt: recordedAt || nowLabel() })
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-void/95 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Vérification d'identité obligatoire"
    >
      <div className="my-8 w-full max-w-lg border border-white/15 bg-surface p-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center bg-violet-electric/15">
              <ShieldCheck className="h-5 w-5 text-violet-electric" />
            </div>
            <div>
              <h2 className="font-display text-xl tracking-wide">Vérification d&apos;identité</h2>
              <p className="font-mono text-[11px] text-ivory/40">Requise pour ta première commande</p>
            </div>
          </div>
          {onCancel && (
            <button onClick={onCancel} className="text-ivory/30 hover:text-ivory transition" aria-label="Annuler">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="border border-violet-electric/20 bg-violet-electric/5 px-4 py-3 font-mono text-xs text-ivory/60 leading-relaxed">
          Cette vérification est obligatoire une seule fois et garantit la sécurité de la communauté.
          Tes fichiers sont transmis chiffrés et consultables uniquement par l&apos;équipe.
        </div>

        {/* Prévisualisation caméra */}
        <div className="relative aspect-video w-full overflow-hidden border border-white/10 bg-void">
          <video
            ref={liveVideoRef}
            muted
            playsInline
            className={`h-full w-full object-cover transition-opacity ${cameraReady ? "opacity-100" : "opacity-0"}`}
          />
          {!cameraReady && !cameraError && (
            <div className="absolute inset-0 grid place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-ivory/30" />
            </div>
          )}
          {cameraError && (
            <div className="absolute inset-0 grid place-items-center p-4 text-center space-y-3">
              <AlertTriangle className="mx-auto h-6 w-6 text-signal" />
              <p className="font-mono text-xs text-ivory/50">{cameraError}</p>
              <button
                onClick={startCamera}
                className="flex items-center gap-1.5 mx-auto border border-white/15 px-3 py-1.5 font-mono text-xs text-ivory/60 hover:text-ivory transition"
              >
                <RefreshCw className="h-3 w-3" /> Réessayer
              </button>
            </div>
          )}
          {recording && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-signal/90 px-2 py-1">
              <CircleDot className="h-3 w-3 text-white animate-pulse" />
              <span className="font-mono text-[10px] text-white">{seconds}s / {MAX_SECONDS}s</span>
            </div>
          )}
        </div>

        {/* Étape 1 — Photo */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className={`grid h-5 w-5 shrink-0 place-items-center text-[10px] font-bold transition ${photoFile ? "bg-violet-electric/20 text-violet-electric" : "bg-white/10 text-ivory/40"}`}>
              {photoFile ? <Check className="h-3 w-3" /> : "1"}
            </span>
            <p className="font-mono text-xs uppercase tracking-widest text-ivory/60">Selfie photo</p>
          </div>
          {!photoFile ? (
            <div className="flex gap-2">
              <button
                onClick={capturePhoto}
                disabled={!cameraReady}
                className="flex items-center gap-2 border border-white/15 px-4 py-2 font-mono text-xs text-ivory/70 hover:border-violet-electric/50 hover:text-violet-electric transition disabled:opacity-40"
              >
                <Camera className="h-4 w-4" /> Prendre la photo
              </button>
              <label className="flex cursor-pointer items-center gap-2 border border-white/10 px-4 py-2 font-mono text-xs text-ivory/40 hover:text-ivory/70 transition">
                Importer
                <input type="file" accept="image/*" className="sr-only" onChange={onPhotoUpload} />
              </label>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <img src={photoUrl!} alt="Selfie capturé" crossOrigin="anonymous" className="h-16 w-16 object-cover border border-white/10" />
              <button onClick={retakePhoto} className="flex items-center gap-1.5 font-mono text-[11px] text-ivory/40 hover:text-ivory transition">
                <RefreshCw className="h-3 w-3" /> Reprendre
              </button>
            </div>
          )}
        </div>

        {/* Étape 2 — Vidéo */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className={`grid h-5 w-5 shrink-0 place-items-center text-[10px] font-bold transition ${videoFile ? "bg-violet-electric/20 text-violet-electric" : "bg-white/10 text-ivory/40"}`}>
              {videoFile ? <Check className="h-3 w-3" /> : "2"}
            </span>
            <p className="font-mono text-xs uppercase tracking-widest text-ivory/60">Vidéo selfie ({MIN_SECONDS}-{MAX_SECONDS}s)</p>
          </div>
          <p className="font-mono text-[11px] text-ivory/40">
            Dis clairement : &quot;Je confirme ma commande sur FULLTERPS33&quot;
          </p>
          {!videoFile ? (
            <div className="flex gap-2">
              {!recording ? (
                <button
                  onClick={startRecording}
                  disabled={!cameraReady}
                  className="flex items-center gap-2 border border-white/15 px-4 py-2 font-mono text-xs text-ivory/70 hover:border-violet-electric/50 hover:text-violet-electric transition disabled:opacity-40"
                >
                  <CircleDot className="h-4 w-4" /> Démarrer l&apos;enregistrement
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  disabled={seconds < MIN_SECONDS}
                  className="flex items-center gap-2 border border-signal/40 bg-signal/10 px-4 py-2 font-mono text-xs text-signal hover:bg-signal/20 transition disabled:opacity-40"
                >
                  <Square className="h-4 w-4" /> Arrêter ({seconds}s min {MIN_SECONDS}s)
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Video className="h-5 w-5 shrink-0 text-violet-electric/60" />
              <p className="font-mono text-[11px] text-violet-electric">{recordedAt}</p>
              <button onClick={retakeVideo} className="flex items-center gap-1.5 font-mono text-[11px] text-ivory/40 hover:text-ivory transition">
                <RefreshCw className="h-3 w-3" /> Reprendre
              </button>
            </div>
          )}
        </div>

        {/* Étape 3 — Anti-bot */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className={`grid h-5 w-5 shrink-0 place-items-center text-[10px] font-bold transition ${mathOk ? "bg-violet-electric/20 text-violet-electric" : "bg-white/10 text-ivory/40"}`}>
              {mathOk ? <Check className="h-3 w-3" /> : "3"}
            </span>
            <p className="font-mono text-xs uppercase tracking-widest text-ivory/60">Vérification anti-bot</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="font-mono text-sm text-ivory">{mathA} + {mathB} = ?</p>
            <input
              type="number"
              value={mathAnswer}
              onChange={(e) => setMathAnswer(e.target.value)}
              className="w-20 border border-white/15 bg-void px-3 py-1.5 font-mono text-sm text-ivory outline-none focus:border-violet-electric [appearance:textfield]"
              placeholder="…"
            />
          </div>
        </div>

        {/* Confirmation */}
        <button
          type="button"
          onClick={() => setConfirmed((c) => !c)}
          className="flex items-start gap-3 text-left w-full"
        >
          <div className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center border transition ${confirmed ? "border-violet-electric bg-violet-electric/20" : "border-white/20"}`}>
            {confirmed && <Check className="h-2.5 w-2.5 text-violet-electric" />}
          </div>
          <span className="font-mono text-[11px] text-ivory/50 leading-relaxed">
            Je confirme que les fichiers soumis sont authentiques et me représentent bien.
          </span>
        </button>

        {submitError && (
          <p className="border border-signal/30 bg-signal/10 px-3 py-2 font-mono text-xs text-signal">
            {submitError}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full border border-violet-electric/40 bg-violet-electric/15 py-3 font-mono text-xs uppercase tracking-[0.2em] text-violet-electric transition hover:bg-violet-electric/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting
            ? <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            : "Envoyer la vérification"
          }
        </button>
      </div>
    </div>
  )
}
