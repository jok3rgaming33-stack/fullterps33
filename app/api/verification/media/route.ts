import { issueSignedToken } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/auth"

/**
 * GET /api/verification/media?blobUrl=https://...
 * photo_pathname / video_pathname contiennent l'URL complète du blob (depuis l'upload).
 * Génère un token signé (1h) lié au pathname et retourne l'URL pour <img>/<video>.
 * Accès réservé aux admins.
 */
export async function GET(req: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const blobUrl = req.nextUrl.searchParams.get("blobUrl")
  if (!blobUrl || !blobUrl.startsWith("https://")) {
    return NextResponse.json({ error: "blobUrl manquant ou invalide" }, { status: 400 })
  }

  const rwToken = process.env.BLOB_READ_WRITE_TOKEN
  if (!rwToken) {
    return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN manquant" }, { status: 500 })
  }

  try {
    // Extrait le pathname depuis l'URL blob complète
    // Format : https://<storeId>.public.blob.vercel-storage.com/<pathname>
    const parsed = new URL(blobUrl)
    const pathname = parsed.pathname.replace(/^\//, "")

    const signedToken = await issueSignedToken({
      pathname,
      validUntil: Date.now() + 3600 * 1000, // 1 heure
      token: rwToken,
    })

    return NextResponse.json({ url: `${blobUrl}?token=${signedToken}` })
  } catch (err) {
    console.error("[v0] media KYC error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
