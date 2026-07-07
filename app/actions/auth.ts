'use server'

import { sql } from '@/lib/db'
import { generatePseudo, generateToken, getClientIP } from '@/lib/user-generator'
import { headers } from 'next/headers'
import { setCustomerSession } from '@/lib/auth'

export interface AuthResult {
  ok: boolean
  message: string
  token?: string
  pseudo?: string
}

/**
 * Check if IP has already registered an account this month
 */
export async function checkIPLimit(ip: string): Promise<{ canRegister: boolean; message: string }> {
  try {
    const rows = await sql`
      select count(*) as count from user_registrations_ip
      where ip = ${ip} and last_registration > now() - interval '30 days'
    `
    
    const count = parseInt(rows[0]?.count || '0', 10)
    
    if (count > 0) {
      return {
        canRegister: false,
        message: 'Une tentative d\'inscription a déjà été faite depuis cette IP ce mois-ci. Reviens dans 30 jours.'
      }
    }
    
    return { canRegister: true, message: 'OK' }
  } catch (error) {
    console.error('[AUTH] IP limit check error:', error)
    // Allow registration if check fails
    return { canRegister: true, message: 'OK' }
  }
}

/**
 * Register a new user with auto-generated pseudo and token
 */
export async function registerUser(): Promise<AuthResult> {
  try {
    // Get client IP from headers
    const headersList = await headers()
    const xForwardedFor = headersList.get('x-forwarded-for')
    const xRealIP = headersList.get('x-real-ip')
    
    const clientIP = (xForwardedFor?.split(',')[0].trim() || xRealIP || 'unknown')

    // Check IP registration limit
    const { canRegister, message } = await checkIPLimit(clientIP)
    if (!canRegister) {
      return { ok: false, message }
    }

    // Generate unique pseudo and token
    let pseudo = generatePseudo()
    let attempts = 0
    
    // Ensure pseudo is unique
    while (attempts < 5) {
      const existing = await sql`select id from users where pseudo = ${pseudo}`
      if (existing.length === 0) break
      pseudo = generatePseudo()
      attempts++
    }

    if (attempts === 5) {
      return { ok: false, message: 'Erreur lors de la génération du pseudo. Réessaie.' }
    }

    const token = generateToken()

    // Create user
    console.log('[AUTH] Creating user with pseudo:', pseudo, 'token:', token.substring(0, 10) + '...')
    await sql`
      insert into users (token, pseudo, created_ip)
      values (${token}, ${pseudo}, ${clientIP})
    `
    console.log('[AUTH] User created successfully')

    // Track IP registration
    console.log('[AUTH] Tracking IP registration from:', clientIP)
    await sql`
      insert into user_registrations_ip (ip, count, last_registration)
      values (${clientIP}, 1, now())
      on conflict (ip) do update set count = count + 1, last_registration = now()
    `
    console.log('[AUTH] IP tracking recorded')

    // Set session with token
    await setCustomerSession(token)
    console.log('[AUTH] Session set')

    return {
      ok: true,
      message: 'Bienvenue dans FULLTERPS33!',
      token,
      pseudo
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[AUTH] Registration error:', errorMsg)
    console.error('[AUTH] Full error:', error)
    
    // Return more specific error messages
    if (errorMsg.includes('duplicate key')) {
      return { ok: false, message: 'Ce pseudo existe déjà' }
    } else if (errorMsg.includes('UNIQUE constraint')) {
      return { ok: false, message: 'Erreur: données en conflit' }
    }
    
    return { ok: false, message: `Erreur: ${errorMsg.substring(0, 50)}` }
  }
}

/**
 * Login with token (for returning users)
 */
export async function loginWithToken(token: string): Promise<AuthResult> {
  try {
    const rows = await sql`
      select id, token, pseudo from users where token = ${token}
    `

    if (rows.length === 0) {
      return { ok: false, message: 'Token invalide ou expiré' }
    }

    const user = rows[0]
    await setCustomerSession(token)

    return {
      ok: true,
      message: 'Bienvenue!',
      token: user.token,
      pseudo: user.pseudo
    }
  } catch (error) {
    console.error('[AUTH] Login error:', error)
    return { ok: false, message: 'Erreur lors de la connexion' }
  }
}

/**
 * Get current user from token
 */
export async function getCurrentUser(): Promise<{ token: string; pseudo: string; loyaltyPoints: number } | null> {
  try {
    const headersList = await headers()
    const token = headersList.get('cookie')
      ?.split(';')
      .find(c => c.trim().startsWith('customer-session='))
      ?.split('=')[1]

    if (!token) return null

    const rows = await sql`
      select token, pseudo, loyalty_points from users where token = ${token}
    `

    if (rows.length === 0) return null

    return {
      token: rows[0].token,
      pseudo: rows[0].pseudo,
      loyaltyPoints: rows[0].loyalty_points
    }
  } catch (error) {
    console.error('[AUTH] Get current user error:', error)
    return null
  }
}

/**
 * Logout user
 */
export async function logoutUser() {
  const { clearCustomerSession } = await import('@/lib/auth')
  await clearCustomerSession()
}
