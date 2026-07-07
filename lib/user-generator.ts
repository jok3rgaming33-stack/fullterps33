import crypto from 'crypto'

const ADJECTIVES = [
  'Neon', 'Electric', 'Cosmic', 'Savage', 'Toxic', 'Rogue', 'Phoenix', 'Storm',
  'Shadow', 'Blaze', 'Sonic', 'Cyber', 'Venom', 'Ghost', 'Titan', 'Apex',
  'Nova', 'Void', 'Echo', 'Volt', 'Inferno', 'Mystic', 'Primal', 'Quantum'
]

const NOUNS = [
  'Terps', 'Pulse', 'Strike', 'Force', 'Spirit', 'Vortex', 'Surge', 'Matrix',
  'Nexus', 'Flux', 'Zephyr', 'Typhoon', 'Raptor', 'Kraken', 'Sphinx', 'Dragon',
  'Raven', 'Falcon', 'Eagle', 'Panther', 'Viper', 'Scarab', 'Phoenix', 'Spectral'
]

/**
 * Generate a random unique pseudo: AdjectiveNoun0000
 */
export function generatePseudo(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const number = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${adjective}${noun}${number}`
}

/**
 * Generate a cryptographically secure opaque token (64 hex chars).
 * Stateless, no JWT — stored in DB and matched on login.
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Extract client IP from request headers.
 */
export function getClientIP(headers: { 'x-forwarded-for'?: string; 'x-real-ip'?: string }): string {
  return headers['x-forwarded-for']?.split(',')[0].trim() ||
         headers['x-real-ip'] ||
         'unknown'
}
