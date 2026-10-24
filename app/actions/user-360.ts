"use server"

import { sql } from "@/lib/db"
import { isAdmin } from "@/lib/auth"
import { averageScore } from "@/lib/ratings"
import { listLoginsForToken, type LoginLogRow } from "@/app/actions/login-logs"

export type User360Order = {
  id: number
  summary: string
  total: number
  status: string
  fulfillment: string
  createdAt: string
}

export type User360Rating = {
  id: number
  productName: string
  avgScore: number
  comment: string | null
  createdAt: string
}

export type User360Data = {
  id: number
  pseudo: string
  createdAt: string
  createdIp: string | null
  adminNotes: string | null
  deletedAt: string | null
  flags: Record<string, boolean>
  loyaltyPoints: number
  loyaltyAdjustment: number
  orderCount: number
  deliveredCount: number
  totalSpentDelivered: number
  discussionCount: number
  verification: { status: string; createdAt: string | null } | null
  orders: User360Order[]
  discussions: User360Order[]
  logins: LoginLogRow[]
  ratings: User360Rating[]
}

const DISCUSSION = new Set(["discussion", "pris_en_charge", "ouvert", "ferme"])

function readFlags(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  const out: Record<string, boolean> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === true) out[key] = true
  }
  return out
}

export async function getUser360(
  userId: number,
): Promise<{ ok: true; data: User360Data } | { ok: false; error: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Non autorisé." }
  const id = Math.trunc(Number(userId))
  if (!id) return { ok: false, error: "Membre introuvable." }

  const users = await sql`
    select id, token, pseudo, created_at, created_ip, admin_notes, deleted_at,
           loyalty_points, coalesce(loyalty_adjustment, 0) as loyalty_adjustment, flags
    from users
    where id = ${id}
    limit 1
  `
  const user = users[0] as unknown as {
    token: string
    pseudo: string
    created_at: string
    created_ip: string | null
    admin_notes: string | null
    deleted_at: string | null
    loyalty_points: number
    loyalty_adjustment: number
    flags: unknown
  } | undefined
  if (!user) return { ok: false, error: "Membre introuvable." }

  const [threads, statsRows, verifs, ratingRows, logins] = await Promise.all([
    sql`
      select id, summary, total, status, fulfillment, created_at
      from order_threads
      where user_token = ${user.token}
      order by created_at desc
      limit 40
    `,
    sql`
      select
        count(*) filter (where status not in ('discussion', 'pris_en_charge', 'ouvert', 'ferme'))::int as orders,
        count(*) filter (where status = 'livree')::int as delivered,
        coalesce(sum(total) filter (where status = 'livree'), 0)::int as spent,
        count(*) filter (where status in ('discussion', 'pris_en_charge', 'ouvert', 'ferme'))::int as discussions
      from order_threads
      where user_token = ${user.token}
    `,
    sql`
      select status, created_at
      from user_verifications
      where user_token = ${user.token}
      order by created_at desc
      limit 1
    `.catch(() => []),
    sql`
      select r.id, r.taste, r.bottle, r.packaging, r.delivery, r.comment, r.created_at, p.name as product_name
      from product_ratings r
      left join products p on p.id = r.product_id
      where r.user_token = ${user.token}
      order by r.created_at desc
      limit 20
    `.catch(() => []),
    listLoginsForToken(user.token, 20),
  ])

  const mapped = (threads as unknown as {
    id: number
    summary: string | null
    total: number
    status: string
    fulfillment: string | null
    created_at: string
  }[]).map((row) => ({
    id: row.id,
    summary: row.summary?.trim() || `Commande #${row.id}`,
    total: Number(row.total ?? 0),
    status: row.status,
    fulfillment: row.fulfillment ?? "livraison",
    createdAt: row.created_at,
  }))
  const orders = mapped.filter((row) => !DISCUSSION.has(row.status))
  const discussions = mapped.filter((row) => DISCUSSION.has(row.status))
  const stats = (statsRows as unknown as { orders?: number; delivered?: number; spent?: number; discussions?: number }[])[0]
  const verif = (verifs as unknown as { status?: string; created_at?: string }[])[0]

  return {
    ok: true,
    data: {
      id,
      pseudo: user.pseudo,
      createdAt: user.created_at,
      createdIp: user.created_ip,
      adminNotes: user.admin_notes,
      deletedAt: user.deleted_at,
      flags: readFlags(user.flags),
      loyaltyPoints: Number(user.loyalty_points ?? 0),
      loyaltyAdjustment: Number(user.loyalty_adjustment ?? 0),
      orderCount: Number(stats?.orders ?? orders.length),
      deliveredCount: Number(stats?.delivered ?? 0),
      totalSpentDelivered: Number(stats?.spent ?? 0),
      discussionCount: Number(stats?.discussions ?? discussions.length),
      verification: verif ? { status: String(verif.status ?? "pending"), createdAt: verif.created_at ?? null } : null,
      orders,
      discussions,
      logins,
      ratings: (ratingRows as unknown as {
        id: number
        taste: number
        bottle: number
        packaging: number
        delivery: number
        comment: string | null
        created_at: string
        product_name: string | null
      }[]).map((row) => ({
        id: row.id,
        productName: row.product_name?.trim() || "Produit",
        avgScore: averageScore({
          taste: Number(row.taste),
          bottle: Number(row.bottle),
          packaging: Number(row.packaging),
          delivery: Number(row.delivery),
        }),
        comment: row.comment,
        createdAt: row.created_at,
      })),
    },
  }
}
