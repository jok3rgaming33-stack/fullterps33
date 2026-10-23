/** Textes publics de la base e-liquides. Le nom est un nom de travail, remplaçable dans les réglages. */
export const BRAND_NAME = "BRUMÉCO"

export const BRAND_TITLE = "BRUMÉCO — E-liquides éco-durables"

export const BRAND_DESCRIPTION =
  "E-boutique d'e-liquides pour cigarette électronique. Flacons rechargeables, formules suivies. Réservé aux 18 ans et plus."

export const HERO_EYEBROW = "E-liquides éco-durables"

export const HERO_BODY =
  "Des e-liquides pour cigarette électronique, en flacons rechargeables. Recettes courtes, verre plutôt que plastique jetable. Vente réservée aux 18 ans et plus."

export const HERO_CTA = "Voir le catalogue"

export const FOOTER_TAGLINE =
  "Flacons rechargeables, formules courtes. Vente interdite aux mineurs."

export const AGE_NOTE =
  "Produit réservé aux adultes. La nicotine crée une forte dépendance. Vente interdite aux moins de 18 ans."

/**
 * Termes explicitement liés aux stupéfiants, refusés dans les textes publics.
 * Comparaison insensible à la casse et aux accents, sur mots entiers uniquement
 * (« thc » dans un autre mot ne déclenche rien). Les mots courants ou à double
 * sens (menu, plug, haze, gelato, pollen…) et l'ancienne marque ne sont plus
 * filtrés, et il n'y a plus de remplacement automatique d'anciennes formulations.
 */
const FORBIDDEN_TERMS = [
  "cannabis", "marijuana", "weed", "beuh", "thc", "kush", "skunk", "amnesia", "runtz",
  "resine", "hashish", "haschich", "haschisch", "barrette", "savonnette",
  "cocaine", "mdma", "ecstasy", "ecsta",
] as const

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

// Pas de lookbehind (non supporté par les anciens Safari iOS) : le groupe 1 capture le séparateur.
const FORBIDDEN_RE = new RegExp(`(^|[^a-z0-9])((?:${FORBIDDEN_TERMS.join("|")})s?)(?=[^a-z0-9]|$)`)

/** Premier terme non autorisé trouvé dans le texte (tel qu'écrit), ou null. */
export function findForbiddenTerm(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  const norm = normalize(value)
  const m = FORBIDDEN_RE.exec(norm)
  if (!m) return null
  // NFD + suppression des diacritiques peut décaler les index : on relit le mot dans le texte d'origine si possible.
  const original = value.normalize("NFC")
  const start = m.index + m[1].length
  return original.length === norm.length ? original.slice(start, start + m[2].length) : m[2]
}

/** Texte affiché en vitrine. `showStored` (session admin) montre la valeur enregistrée telle quelle. */
export function visibleShopText(value: unknown, fallback: string, showStored = false): string {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  if (showStored) return trimmed
  if (findForbiddenTerm(trimmed)) return fallback
  return trimmed
}

export function publicText(value: unknown, fallback: string): string {
  return visibleShopText(value, fallback, false)
}

export function isForbiddenCopy(value: unknown): boolean {
  if (typeof value !== "string") return false
  const trimmed = value.trim()
  if (!trimmed) return false
  return findForbiddenTerm(trimmed) !== null
}
