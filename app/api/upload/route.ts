import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { type NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/auth"

const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime",
])

/**
 * Route utilisée par @vercel/blob/client upload() pour :
 * 1. Générer un token client (GET-like via POST body type=blob.generate-client-token)
 * 2. Confirmer l'upload terminé (POST body type=blob.upload-completed)
 *
 * Le fichier transite directement du navigateur vers Vercel Blob —
 * aucune limite de body Next.js ne s'applique.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: [...ALLOWED_TYPES],
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("[upload] completed:", blob.url)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error("[upload] handleUpload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur upload" },
      { status: 400 },
    )
  }
}
