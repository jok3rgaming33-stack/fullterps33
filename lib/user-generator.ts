import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// Adjectives for pseudo generation
const ADJECTIVES = [
  'Neon', 'Electric', 'Cosmic', 'Savage', 'Toxic', 'Rogue', 'Phoenix', 'Storm',
  'Shadow', 'Blaze', 'Sonic', 'Cyber', 'Venom', 'Ghost', 'Titan', 'Apex',
  'Nova', 'Void', 'Echo', 'Volt', 'Inferno', 'Mystic', 'Primal', 'Quantum'
]

// Nouns for pseudo generation
const NOUNS = [
  'Terps', 'Pulse', 'Strike', 'Force', 'Spirit', 'Vortex', 'Surge', 'Matrix',
  'Nexus', 'Flux', 'Zephyr', 'Typhoon', 'Raptor', 'Kraken', 'Sphinx', 'Dragon',
  'Raven', 'Falcon', 'Eagle', 'Panther', 'Viper', 'Scarab', 'Phoenix', 'Spectral'
]

export function generatePseudo(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const number = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${adjective}${noun}${number}`
}

export function generateToken(): string {
  const secret = process.env.BETTER_AUTH_SECRET || 'dev-secret'
  const payload = {
    id: crypto.randomBytes(16).toString('hex'),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 10 // 10 years
  }
  return jwt.sign(payload, secret, { algorithm: 'HS256' })
}

export function verifyToken(token: string): any {
  try {
    const secret = process.env.BETTER_AUTH_SECRET || 'dev-secret'
    return jwt.verify(token, secret, { algorithms: ['HS256'] })
  } catch (err) {
    return null
  }
}

export function getClientIP(headers: Headers | { 'x-forwarded-for'?: string; 'x-real-ip'?: string }): string {
  if (headers instanceof Headers) {
    return headers.get('x-forwarded-for')?.split(',')[0].trim() ||
           headers.get('x-real-ip') ||
           'unknown'
  }
  return headers['x-forwarded-for']?.split(',')[0].trim() ||
         headers['x-real-ip'] ||
         'unknown'
}
