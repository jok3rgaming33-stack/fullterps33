"use server"

import { sql } from "@/lib/db"
import { isAdmin, getCustomerToken } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"

export type LoyaltyTier = {
  id: number
  label: string
  pointsRequired: number
  discountEuros: number
  sortOrder: number
}

// ── Lecture publique ──────────────────────────────────────────────────────

export async function getLoyaltyTiers(): Promise<LoyaltyTier[]> {
  const rows = await sql`SELECT * FROM loyalty_tiers ORDER BY sort_order ASC`
  return rows.map((r: any) => ({
    id:             r.id,
    label:          r.label,
    pointsRequired: r.points_required,
    discountEuros:  r.discount_euros,
    sortOrder:      r.sort_order,
  }))
}

// ── Admin CRUD ────────────────────────────────────────────────────────────

export async function upsertLoyaltyTier(
  tier: Omit<LoyaltyTier, "id"> & { id?: number }
): Promise<{ ok: boolean; error?: string }> {
  if (!await isAdmin()) return { ok: false, error: "Non autorisé" }
  try {
    if (tier.id) {
      await sql`
        UPDATE loyalty_tiers SET
          label           = ${tier.label},
          points_required = ${tier.pointsRequired},
          discount_euros  = ${tier.discountEuros},
          sort_order      = ${tier.sortOrder}
        WHERE id = ${tier.id}
      `
    } else {
      await sql`
        INSERT INTO loyalty_tiers (label, points_required, discount_euros, sort_order)
        VALUES (${tier.label}, ${tier.pointsRequired}, ${tier.discountEuros}, ${tier.sortOrder})
      `
    }
    revalidatePath("/admin")
    revalidatePath("/compte")
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur" }
  }
}

export async function deleteLoyaltyTier(id: number): Promise<{ ok: boolean }> {
  if (!await isAdmin()) return { ok: false }
  await sql`DELETE FROM loyalty_tiers WHERE id = ${id}`
  revalidatePath("/admin")
  revalidatePath("/compte")
  return { ok: true }
}

// ── Génération code récompense (client authentifié) ───────────────────────

/**
 * Génère un code promo fixe à usage unique pour un client éligible à un palier.
 * - Vérifie le solde de points
 * - Vérifie qu'un code actif n'a pas déjà été émis pour ce token + palier
 * - Insère dans promo_codes (type fixed, usage unique, is_loyalty_reward=true)
 * - Débite les points du palier du solde client
 */
export async function claimLoyaltyReward(
  tierId: number
): Promise<{ ok: boolean; code?: string; error?: string }> {
  const token = await getCustomerToken()
  if (!token) return { ok: false, error: "Non authentifié" }

  const users = await sql`SELECT id, loyalty_points FROM users WHERE token = ${token} LIMIT 1`
  if (!users.length) return { ok: false, error: "Compte introuvable" }
  const user = users[0]

  const tiers = await sql`SELECT * FROM loyalty_tiers WHERE id = ${tierId} LIMIT 1`
  if (!tiers.length) return { ok: false, error: "Palier introuvable" }
  const tier = tiers[0]

  if (user.loyalty_points < tier.points_required) {
    return {
      ok: false,
      error: `Points insuffisants — il te faut ${tier.points_required} pts (solde : ${user.loyalty_points})`,
    }
  }

  // Vérifier qu'un code actif n'a pas déjà été émis pour ce token + palier
  const existing = await sql`
    SELECT code FROM promo_codes
    WHERE is_loyalty_reward = true
      AND reward_tier_id    = ${tierId}
      AND issued_to_token   = ${token}
      AND active            = true
    LIMIT 1
  `
  if (existing.length > 0) {
    return { ok: false, error: `Code déjà généré : utilise ${existing[0].code}` }
  }

  // Générer le code : FT-XXXX-XXXX
  const code = `FT-${nanoid(4).toUpperCase()}-${nanoid(4).toUpperCase()}`

  await sql`
    INSERT INTO promo_codes
      (code, type, value, min_amount, active, is_loyalty_reward, reward_tier_id, issued_to_token)
    VALUES
      (${code}, 'fixed', ${tier.discount_euros}, 0, true, true, ${tierId}, ${token})
  `

  // Débiter les points
  await sql`
    UPDATE users SET
      loyalty_points     = loyalty_points     - ${tier.points_required},
      loyalty_adjustment = loyalty_adjustment - ${tier.points_required}
    WHERE token = ${token}
  `

  revalidatePath("/compte")
  return { ok: true, code }
}

// ── Marquer un code récompense comme consommé lors du passage de commande ──

export async function consumeLoyaltyCode(code: string, byToken: string): Promise<void> {
  await sql`
    UPDATE promo_codes
    SET active = false, used_by_token = ${byToken}
    WHERE code = ${code} AND is_loyalty_reward = true
  `
}
