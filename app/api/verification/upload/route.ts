import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const token = String(formData.get("token") ?? "").trim()
    const kind = String(formData.get("kind") ?? "").trim() // 'photo' | 'video'

    if (!file) return NextResponse.json({ error: "Fichier manquant." }, { status: 400 })
    if (!token || (kind !== "photo" && kind !== "video")) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 })
    }

    // Vérifie que le token correspond à un compte réel
    const rows = await sql`select id from users where token = ${token} limit 1`
    if (rows.length === 0) {
      return NextResponse.json({ error: "Compte introuvable." }, { status: 401 })
    }

    // Limites de taille (photo 10 Mo, vidéo 50 Mo)
    const maxBytes = kind === "video" ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxBytes) {
      return NextResponse.json({ error: "Fichier trop volumineux." }, { status: 413 })
    }

    const ext = kind === "video" ? "webm" : "jpg"
    const safeToken = token.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32)
    const pathname = `verifications/${safeToken}/${kind}-${Date.now()}.${ext}`

    const blob = await put(pathname, file, { access: "private", addRandomSuffix: true })

    // On retourne l'URL complète (pas seulement le pathname) pour pouvoir
    // générer des tokens signés depuis l'admin sans reconstruire l'URL.
    return NextResponse.json({ pathname: blob.url })
  } catch (error) {
    console.error("[v0] verification upload error:", error)
    return NextResponse.json({ error: "Échec de l'envoi." }, { status: 500 })
  }
}
