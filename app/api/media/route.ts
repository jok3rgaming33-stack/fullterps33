import { get } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { getCustomerToken, isAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"

/**
 * Proxy pour les médias privés Vercel Blob.
 * GET /api/media?url=<blobUrl>
 * Accessible aux clients connectés et aux admins.
 */
export async function GET(request: NextRequest): Promise<NextResponse | Response> {
  const [admin, customerToken] = await Promise.all([isAdmin(), getCustomerToken()])
  if (!admin && !customerToken) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const blobUrl = searchParams.get("url")

  if (!blobUrl) {
    return NextResponse.json({ error: "Paramètre url manquant" }, { status: 400 })
  }

  // Sécurité : accepter uniquement les URLs du store Blob du projet
  if (!blobUrl.includes(".public.blob.vercel-storage.com") && !blobUrl.includes(".blob.vercel-storage.com")) {
    return NextResponse.json({ error: "URL non autorisée" }, { status: 403 })
  }

  try {
    const result = await get(blobUrl, { access: "private" })

    if (!result) {
      return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 })
    }

    if (result.statusCode === 304) {
      return new Response(null, { status: 304 })
    }

    // statusCode === 200
    const headers = new Headers()
    headers.set("Content-Type", result.blob.contentType)
    headers.set("Content-Length", String(result.blob.size))
    // Cache 1h côté navigateur, privé
    headers.set("Cache-Control", "private, max-age=3600")

    return new Response(result.stream, { headers })
  } catch (error) {
    console.error("[media proxy] error:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération" }, { status: 500 })
  }
}
