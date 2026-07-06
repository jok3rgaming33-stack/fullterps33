"use server"

import { sql } from "@/lib/db"
import { isAdmin } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export type PromoCode = {
  code: string
  type: "percent" | "fixed"
  value: number
  minAmount: number
  active: boolean
}

export type PromoResult = {
  ok: boolean
  message: string
  discount?: number
  code?: string
}

export async function validatePromoCode(code: string, subtotal: number): Promise<PromoResult> {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return { ok: false, message: "Entrez un code" }

  const rows = await sql`select * from promo_codes where code = ${normalized} and active = true`
  const promo = rows[0]
  if (!promo) return { ok: false, message: "Code invalide ou expiré" }
  if (subtotal < promo.min_amount) {
    return { ok: false, message: `Montant minimum requis : ${promo.min_amount}€` }
  }

  const discount = promo.type === "percent" ? Math.round((subtotal * promo.value) / 100) : promo.value
  return { ok: true, message: "Code appliqué", discount: Math.min(discount, subtotal), code: normalized }
}

export async function listPromoCodes(): Promise<PromoCode[]> {
  if (!isAdmin()) throw new Error("Non autorisé")
  const rows = await sql`select * from promo_codes order by created_at desc`
  return rows.map((r: any) => ({
    code: r.code,
    type: r.type,
    value: r.value,
    minAmount: r.min_amount,
    active: r.active,
  }))
}

export async function createPromoCode(input: PromoCode) {
  if (!isAdmin()) throw new Error("Non autorisé")
  const code = input.code.trim().toUpperCase()
  await sql`
    insert into promo_codes (code, type, value, min_amount, active)
    values (${code}, ${input.type}, ${input.value}, ${input.minAmount}, ${input.active})
    on conflict (code) do update set
      type = excluded.type, value = excluded.value, min_amount = excluded.min_amount, active = excluded.active
  `
  revalidatePath("/admin")
}

export async function deletePromoCode(code: string) {
  if (!isAdmin()) throw new Error("Non autorisé")
  await sql`delete from promo_codes where code = ${code}`
  revalidatePath("/admin")
}
