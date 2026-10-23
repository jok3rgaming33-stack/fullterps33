import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { getCustomerToken, isAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"

const ALLOWED = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/aac",
  "audio/ogg",
  "audio/mpeg",
  "audio/wav",
  "audio/x-m4a",
  "audio/m4a",
])

const MAX_BYTES = 8 * 1024 * 1024

export async function POST(request: NextRequest): Promise<NextResponse> {
  const [token, admin] = await Promise.all([getCustomerToken(), isAdmin()])
  if (!token && !admin) {
    return NextResponse.json({ error: "Connecte-toi pour envoyer un vocal." }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Aucun fichier" }, { status: 400 })
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Vocal trop lourd (8 Mo max)." }, { status: 400 })
    }

    const mime = (file.type || "audio/webm").split(";")[0].trim().toLowerCase()
    if (!ALLOWED.has(mime)) {
      return NextResponse.json({ error: `Format audio non supporté : ${mime || "inconnu"}` }, { status: 400 })
    }

    const ext = mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")
      ? "m4a"
      : mime.includes("ogg")
        ? "ogg"
        : mime.includes("mpeg")
          ? "mp3"
          : mime.includes("wav")
            ? "wav"
            : "webm"

    const blob = await put(`messages/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`, file, {
      access: "private",
      contentType: mime,
    })

    return NextResponse.json({ url: blob.url, type: mime })
  } catch (error) {
    console.error("[messages/upload]", error)
    return NextResponse.json({ error: "Envoi du vocal impossible." }, { status: 500 })
  }
}
