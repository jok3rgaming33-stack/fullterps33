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

const LEGACY: Record<string, string> = {
  "fullterps33": BRAND_NAME,
  "ton plug bordelais depuis 2021": HERO_EYEBROW,
  "\"ton plug bordelais depuis 2021\"": HERO_EYEBROW,
  "que de la foudre la famille.": FOOTER_TAGLINE,
  "édition capsule": "Les classiques",
  "édition capsule — automne": HERO_EYEBROW,
  "coupes larges, matières lourdes, silhouette orage. le streetwear pensé pour la rue, la nuit, et ce qui gronde au-dessus.": HERO_BODY,
  "voir la collection": HERO_CTA,
  "notre menu": HERO_CTA,
  "\"notre menu\"": HERO_CTA,
  "fraîchement débarqués": "Arrivages",
  "fraîchement débarqué": "Arrivages",
}

const BANNED =
  /full\s*terps|fullterps|\bplug\b|meet-?up|foudre la famille|streetwear|bordelais|\bbeuh\b|\bweed\b|\bcannabis\b|\bmarijuana\b|\bkush\b|\bhaze\b|\bskunk\b|\bamnesia\b|\bgelato\b|\bruntz\b|\bpollen\b|r[ée]sine|\bshit\b|coca[iï]ne|\bmdma\b|\becsta|\bthc\b|\bhashish\b|\bhaschich\b|\bbarrette\b|\bsavonnette\b/i

/** Texte affiché en vitrine. `showStored` (session admin) montre la valeur enregistrée telle quelle. */
export function visibleShopText(value: unknown, fallback: string, showStored = false): string {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  if (showStored) return trimmed
  if (Object.prototype.hasOwnProperty.call(LEGACY, trimmed.toLowerCase())) return fallback
  if (BANNED.test(trimmed)) return fallback
  return trimmed
}

export function publicText(value: unknown, fallback: string): string {
  return visibleShopText(value, fallback, false)
}

export function isForbiddenCopy(value: unknown): boolean {
  if (typeof value !== "string") return false
  const trimmed = value.trim()
  if (!trimmed) return false
  if (LEGACY[trimmed.toLowerCase()]) return true
  return BANNED.test(trimmed)
}
