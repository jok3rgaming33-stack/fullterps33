import { NextRequest, NextResponse } from "next/server"
import { getMapOrigin } from "@/app/actions/settings"

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim()
  if (!q) return NextResponse.json({ found: false, error: "Adresse manquante" }, { status: 400 })

  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=1&autocomplete=0`
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return NextResponse.json({ found: false, error: "Erreur API adresse" }, { status: 502 })

    const data = await res.json()
    const feature = data?.features?.[0]
    if (!feature) return NextResponse.json({ found: false })

    const [lng, lat] = feature.geometry.coordinates as [number, number]
    const label = feature.properties.label as string
    const origin = await getMapOrigin()
    const distanceKm = haversineKm(origin.lat, origin.lng, lat, lng)

    return NextResponse.json({ found: true, lat, lng, label, distanceKm: Math.round(distanceKm * 10) / 10 })
  } catch {
    return NextResponse.json({ found: false, error: "Erreur serveur" }, { status: 500 })
  }
}
