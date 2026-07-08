import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/auth"

const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime", "video/mov",
])

// Désactive la limite de body par défaut (4 MB) — nécessaire pour les vidéos
export const config = {
  api: { bodyParser: false },
}

// Next.js App Router : désactive le body parsing interne
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest): Promise<NextResponse> {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  try {
    const contentType = request.headers.get("content-type") ?? ""

    let file: File | null = null
    let filename = `upload-${Date.now()}`

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      file = formData.get("file") as File | null
      if (!file) return NextResponse.json({ error: "Aucun fichier" }, { status: 400 })
      filename = file.name
    } else {
      // Stream direct — le filename et content-type sont passés en headers
      filename = request.headers.get("x-filename") ?? filename
    }

    const mimeType = file?.type ?? request.headers.get("x-content-type") ?? "application/octet-stream"

    if (!ALLOWED_TYPES.has(mimeType)) {
      return NextResponse.json({ error: `Type non supporté : ${mimeType}` }, { status: 400 })
    }

    const ext = filename.split(".").pop() ?? "bin"
    const safeName = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const body = file ?? request.body
    if (!body) return NextResponse.json({ error: "Body vide" }, { status: 400 })

    const blob = await put(safeName, body, {
      access: "public",
      contentType: mimeType,
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("[upload] error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur upload" },
      { status: 500 },
    )
  }
}
