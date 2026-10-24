import { redirect } from "next/navigation"
import { getActor } from "@/app/actions/staff"
import { listLivreurOrders } from "@/app/actions/livreur"
import { LivreurBoard } from "@/components/livreur-board"

export const dynamic = "force-dynamic"

export default async function LivreurPage() {
  const actor = await getActor()
  if (!actor) redirect("/admin")
  if (actor.role === "admin") redirect("/admin")
  const orders = await listLivreurOrders()
  return <LivreurBoard orders={orders} pseudo={actor.pseudo} />
}
