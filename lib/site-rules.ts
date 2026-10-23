import { isForbiddenCopy } from "@/lib/brand"

/** Une partie des modalités. L'ordre du tableau est l'ordre de lecture. */
export type SiteRule = {
  id: string
  title: string
  body: string
}

export const SITE_RULES_KEY = "site_rules"

/** Textes proposés tant que l'admin n'a rien enregistré. Boutique d'e-liquides, 18+. */
export const DEFAULT_SITE_RULES: SiteRule[] = [
  {
    id: "age",
    title: "Âge et nicotine",
    body: "La vente est réservée aux 18 ans et plus. La nicotine crée une forte dépendance. En créant un compte, tu confirmes avoir l'âge légal. Il est interdit de commander pour un mineur.",
  },
  {
    id: "compte",
    title: "Compte et token",
    body: "Le pseudo et le token sont générés automatiquement. Le token est ta seule clé pour te reconnecter : note-le et conserve-le hors ligne. S'il est perdu, le site ne peut pas le renvoyer. Un seul compte peut être créé depuis la même adresse IP sur 30 jours.",
  },
  {
    id: "commande",
    title: "Commande",
    body: "Tu choisis tes e-liquides dans le catalogue et tu les ajoutes au panier. Vérifie le récapitulatif avant de valider. Un fil de discussion s'ouvre ensuite pour confirmer les détails de la commande.",
  },
  {
    id: "livraison",
    title: "Livraison et retrait",
    body: "Tu choisis la livraison à domicile ou le retrait, parmi les créneaux proposés au moment de la commande. Les conditions affichées dans le panier (montant minimum, créneaux) s'appliquent à cette commande.",
  },
  {
    id: "fidelite",
    title: "Fidélité",
    body: "Des points peuvent être crédités selon les paliers affichés dans ton espace compte. Ces avantages sont personnels : ils ne se transmettent pas et suivent les conditions indiquées sur chaque palier.",
  },
  {
    id: "usage",
    title: "Usage du site",
    body: "Les prix, stocks et textes affichés font foi au moment de la commande. Une fausse déclaration d'âge ou un contournement de ces règles peut entraîner la fermeture du compte. Pour une question, utilise la messagerie du site.",
  },
]

const MAX_RULES = 30
const MAX_TITLE = 120
const MAX_BODY = 4000

export function normalizeSiteRules(value: unknown): SiteRule[] {
  if (!Array.isArray(value)) return []
  const out: SiteRule[] = []
  const seen = new Set<string>()
  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const raw = item as { id?: unknown; title?: unknown; body?: unknown }
    const title = typeof raw.title === "string" ? raw.title.trim().slice(0, MAX_TITLE) : ""
    const body = typeof raw.body === "string" ? raw.body.trim().slice(0, MAX_BODY) : ""
    if (!title || !body) continue
    let id = typeof raw.id === "string" ? raw.id.trim().slice(0, 40) : ""
    if (!id) id = `r${out.length + 1}`
    while (seen.has(id)) id = `${id.slice(0, 36)}-${out.length + 1}`
    seen.add(id)
    out.push({ id, title, body })
    if (out.length >= MAX_RULES) break
  }
  return out
}

/** null = jamais enregistré (on propose les textes par défaut). Un tableau vide est un choix admin. */
export function readStoredRules(value: unknown): { saved: boolean; rules: SiteRule[] } {
  if (value && typeof value === "object" && !Array.isArray(value) && Array.isArray((value as { sections?: unknown }).sections)) {
    return { saved: true, rules: normalizeSiteRules((value as { sections: unknown }).sections) }
  }
  if (Array.isArray(value)) return { saved: true, rules: normalizeSiteRules(value) }
  return { saved: false, rules: DEFAULT_SITE_RULES.map((rule) => ({ ...rule })) }
}

export function publicSiteRules(rules: SiteRule[]): SiteRule[] {
  return rules.filter((rule) => !isForbiddenCopy(rule.title) && !isForbiddenCopy(rule.body))
}

/** Empreinte du texte publié. Elle change dès qu'une partie est ajoutée, modifiée ou supprimée. */
export function siteRulesVersion(rules: SiteRule[]): string {
  const raw = rules.map((rule) => `${rule.id}\n${rule.title}\n${rule.body}`).join("\n---\n")
  let hash = 5381
  for (let i = 0; i < raw.length; i++) hash = ((hash << 5) + hash) ^ raw.charCodeAt(i)
  return (hash >>> 0).toString(16)
}
