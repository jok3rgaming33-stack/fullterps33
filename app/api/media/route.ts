import { get } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { hasAccount } from "@/lib/shop-access"

export const dynamic = "force-dynamic"

/**
 * Proxy pour les médias Vercel Blob (store privé).
 * GET /api/media?url=<blobUrl>
 * Réservé à un compte client ou staff. Les pièces d'identité passent par une autre route.
 */
export async function GET(request: NextRequest): Promise<NextResponse | Response> {
  if (!(await hasAccount())) {
    return NextResponse.json({ error: "Connecte-toi pour voir ce fichier." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const blobUrl = searchParams.get("url")

  if (!blobUrl) {
    return NextResponse.json({ error: "Paramètre url manquant" }, { status: 400 })
  }

  // Sécurité : accepter uniquement les URLs du store Blob Vercel, jamais les pièces KYC.
  if (!blobUrl.includes(".blob.vercel-storage.com") || blobUrl.includes("/verifications/")) {
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

    const headers = new Headers()
    headers.set("Content-Type", result.blob.contentType)
    headers.set("Content-Length", String(result.blob.size))
    headers.set("Cache-Control", "private, no-store")

    return new Response(result.stream, { headers })
  } catch (error) {
    console.error("[media proxy] error:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération" }, { status: 500 })
  }
}
