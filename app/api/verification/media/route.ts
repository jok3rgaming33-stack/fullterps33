import { NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/auth"

/**
 * GET /api/verification/media?blobUrl=https://...
 * Proxy sécurisé pour les blobs KYC privés (private.blob.vercel-storage.com).
 * Fetch le blob avec le BLOB_READ_WRITE_TOKEN et retransmet le body au client admin.
 * Accès réservé aux admins.
 */
export async function GET(req: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return new NextResponse("Non autorisé", { status: 401 })
  }

  const blobUrl = req.nextUrl.searchParams.get("blobUrl")
  if (!blobUrl || !blobUrl.startsWith("https://")) {
    return new NextResponse("blobUrl manquant ou invalide", { status: 400 })
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return new NextResponse("BLOB_READ_WRITE_TOKEN manquant", { status: 500 })
  }

  const upstream = await fetch(blobUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!upstream.ok) {
    return new NextResponse(`Blob inaccessible (${upstream.status})`, { status: upstream.status })
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream"
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  })
}
