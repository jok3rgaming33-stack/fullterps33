"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Mic, Square, X } from "lucide-react"

const MAX_SECONDS = 120

function pickMimeType(): { mime: string; ext: string } {
  if (typeof MediaRecorder === "undefined") return { mime: "", ext: "webm" }
  const candidates: { mime: string; ext: string }[] = [
    { mime: "audio/mp4", ext: "m4a" },
    { mime: "audio/mp4;codecs=mp4a.40.2", ext: "m4a" },
    { mime: "audio/aac", ext: "aac" },
    { mime: "audio/webm;codecs=opus", ext: "webm" },
    { mime: "audio/webm", ext: "webm" },
    { mime: "audio/ogg;codecs=opus", ext: "ogg" },
  ]
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c.mime)) return c
    } catch {
      /* ignore */
    }
  }
  return { mime: "", ext: "webm" }
}

function resolveFromRecorderMime(recorderMime: string, fallback: { mime: string; ext: string }) {
  const raw = (recorderMime || fallback.mime || "audio/webm").trim()
  const base = raw.split(";")[0].toLowerCase() || "audio/webm"
  let ext = fallback.ext || "webm"
  if (base.includes("mp4") || base.includes("m4a") || base.includes("aac")) ext = "m4a"
  else if (base.includes("webm")) ext = "webm"
  else if (base.includes("ogg")) ext = "ogg"
  else if (base.includes("mpeg") || base.includes("mp3")) ext = "mp3"
  else if (base.includes("wav")) ext = "wav"
  const type = base.startsWith("audio/") ? base : "audio/webm"
  return { type, ext }
}

type Props = {
  disabled?: boolean
  onSent: (body: string) => Promise<void>
  className?: string
}

/** 1er clic : enregistre. 2e clic : envoie le vocal dans le fil. */
export function VoiceNoteButton({ disabled, onSent, className = "" }: Props) {
  const [supported, setSupported] = useState(false)
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | undefined>(undefined)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mimeRef = useRef({ mime: "", ext: "webm" })
  const cancelledRef = useRef(false)

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== "undefined"
    setSupported(ok)
    if (ok) {
      const picked = pickMimeType()
      mimeRef.current = picked
      if (picked.ext === "webm" || picked.ext === "ogg") {
        setHint("Enregistrement WebM : lisible sur Android et ordinateur. Sur iPhone, le vocal peut ne pas se lire.")
      }
    }
  }, [])

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const cleanupRecorder = () => {
    clearTimer()
    stopStream()
    mediaRecorderRef.current = null
    chunksRef.current = []
    setRecording(false)
    setSeconds(0)
  }

  const uploadAndSend = useCallback(
    async (blob: Blob, recorderMime: string) => {
      setUploading(true)
      setError(null)
      try {
        const { type, ext } = resolveFromRecorderMime(recorderMime || blob.type, mimeRef.current)
        const file = new File([blob], `vocal-${Date.now()}.${ext}`, { type })
        const fd = new FormData()
        fd.append("file", file)
        const res = await fetch("/api/messages/upload", { method: "POST", body: fd })
        const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
        if (!res.ok || !data.url) throw new Error(data.error ?? "Échec de l'envoi du vocal.")
        await onSent(`[audio]${data.url}[/audio]`)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Envoi impossible.")
      } finally {
        setUploading(false)
      }
    },
    [onSent],
  )

  const stopRecording = useCallback((cancel: boolean) => {
    cancelledRef.current = cancel
    const rec = mediaRecorderRef.current
    if (!rec || rec.state === "inactive") {
      cleanupRecorder()
      return
    }
    try {
      if (typeof rec.requestData === "function" && rec.state === "recording") {
        try { rec.requestData() } catch { /* ignore */ }
      }
      rec.stop()
    } catch {
      cleanupRecorder()
    }
  }, [])

  const startRecording = async () => {
    if (disabled || uploading || recording) return
    setError(null)
    cancelledRef.current = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      streamRef.current = stream
      const picked = mimeRef.current
      const rec = picked.mime ? new MediaRecorder(stream, { mimeType: picked.mime }) : new MediaRecorder(stream)
      mediaRecorderRef.current = rec
      chunksRef.current = []
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data)
      }
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || picked.mime || "audio/webm" })
        const mime = rec.mimeType
        cleanupRecorder()
        if (!cancelledRef.current && blob.size > 0) void uploadAndSend(blob, mime)
      }
      rec.start(250)
      setRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            stopRecording(false)
            return s
          }
          return s + 1
        })
      }, 1000)
    } catch {
      cleanupRecorder()
      setError("Micro inaccessible. Autorise le micro du navigateur.")
    }
  }

  if (!supported) return null

  const mm = String(Math.floor(seconds / 60)).padStart(1, "0")
  const ss = String(seconds % 60).padStart(2, "0")

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {recording ? (
        <>
          <span className="font-mono text-[10px] text-red-400">{mm}:{ss}</span>
          <button
            type="button"
            onClick={() => stopRecording(true)}
            className="grid h-10 w-10 place-items-center border border-white/15 text-ivory/50 hover:text-ivory"
            aria-label="Annuler le vocal"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => stopRecording(false)}
            className="grid h-10 w-10 place-items-center border border-red-400/40 bg-red-500/15 text-red-300"
            aria-label="Arrêter et envoyer"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => void startRecording()}
          disabled={disabled || uploading}
          className="grid h-10 w-10 shrink-0 place-items-center border border-white/15 text-ivory/70 transition hover:border-violet-electric hover:text-violet-electric disabled:opacity-40"
          aria-label="Message vocal"
          title={hint}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
        </button>
      )}
      {error && <span className="max-w-[140px] font-mono text-[9px] leading-tight text-red-400">{error}</span>}
    </div>
  )
}
