import { cache } from "react"
import { getCustomerToken } from "@/lib/auth"
import { sql } from "@/lib/db"

/**
 * Vrai seulement pour un compte client existant ou une session staff (admin, livreur).
 * Un cookie inventé ne suffit pas : le jeton doit exister en base.
 */
export const hasAccount = cache(async (): Promise<boolean> => {
  const token = await getCustomerToken()
  if (token) {
    const rows = await sql`
      select 1 from users where token = ${token} and deleted_at is null limit 1
    `
    if (rows.length > 0) return true
  }
  const { getActor } = await import("@/app/actions/staff")
  return (await getActor()) != null
})
