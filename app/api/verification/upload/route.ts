import { put } from '@vercel/blob'
import { type NextRequest, NextResponse } from 'next/server'
import { getCustomerToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const token = await getCustomerToken()
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as 'photo' | 'video'

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })
    }

    if (!['photo', 'video'].includes(type)) {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
    }

    // Validation taille : 5MB max
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 5MB)' }, { status: 400 })
    }

    const ext = type === 'photo' ? 'jpg' : 'mp4'
    const filename = `kyc/${token}/${type}.${ext}`

    // Upload vers Blob privé
    const blob = await put(filename, file, {
      access: 'private',
    })

    return NextResponse.json({ pathname: blob.pathname })
  } catch (error) {
    console.error('[v0] KYC upload error:', error)
    return NextResponse.json({ error: 'Upload échoué' }, { status: 500 })
  }
}
