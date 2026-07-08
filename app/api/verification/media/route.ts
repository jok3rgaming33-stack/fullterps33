import { NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/auth"

/**
 * GET /api/verification/media?blobUrl=https://...
 * Les blobs KYC sont stockés dans un store public Vercel Blob.
 * L'URL complète est directement accessible — pas besoin de token signé.
 * La route valide uniquement que l'appelant est admin.
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

  return NextResponse.json({ url: blobUrl })
}
