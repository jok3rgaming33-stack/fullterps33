import { head } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/auth"

/**
 * GET /api/verification/media?pathname=verifications/...
 * Retourne une URL signée (1h) pour les médias KYC stockés en Blob privé.
 * Accès réservé aux admins.
 */
export async function GET(req: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const pathname = req.nextUrl.searchParams.get("pathname")
  if (!pathname) {
    return NextResponse.json({ error: "pathname manquant" }, { status: 400 })
  }

  try {
    const blob = await head(pathname, { token: process.env.BLOB_READ_WRITE_TOKEN })
    // Pour Blob privé on retourne l'URL qui inclut le token d'accès
    return NextResponse.json({ url: blob.url })
  } catch {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 })
  }
}
