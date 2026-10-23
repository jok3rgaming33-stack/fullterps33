"use client"

const AUDIO_RE = /\[audio\]([\s\S]*?)\[\/audio\]/i

function playableSrc(raw: string): string {
  const url = raw.trim()
  if (!url) return ""
  if (url.startsWith("/api/media")) return url
  if (url.includes(".blob.vercel-storage.com")) {
    return `/api/media?url=${encodeURIComponent(url)}`
  }
  return url
}

/** Texte d'un message, ou lecteur audio si le corps est un vocal. */
export function MessageBody({ content }: { content: string }) {
  const match = content.match(AUDIO_RE)
  if (!match) {
    return <p className="whitespace-pre-wrap break-words">{content}</p>
  }
  const src = playableSrc(match[1] ?? "")
  return (
    <div className="min-w-[200px]">
      <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-ivory/40">Message vocal</p>
      {src ? (
        <audio controls preload="none" src={src} className="h-9 w-full max-w-[260px]" />
      ) : (
        <p className="text-xs text-ivory/50">Vocal indisponible.</p>
      )}
    </div>
  )
}
