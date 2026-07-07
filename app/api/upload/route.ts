import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/auth"

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
]

const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

export async function POST(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Type de fichier non supporté" }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Fichier trop lourd (max 20 Mo)" }, { status: 400 })
    }

    const ext = file.name.split(".").pop() ?? "bin"
    const filename = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("[upload] error:", error)
    return NextResponse.json({ error: "Erreur upload" }, { status: 500 })
  }
}
