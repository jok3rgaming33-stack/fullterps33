import { redirect } from "next/navigation"
import { getActor } from "@/app/actions/staff"
import { getLivreurOrder } from "@/app/actions/livreur"
import { RunDeliveryClient } from "@/components/run-delivery-client"

export const dynamic = "force-dynamic"

export default async function TourneePage({ params }: { params: { id: string } }) {
  const actor = await getActor()
  if (!actor) redirect("/admin")
  const id = Number(params.id)
  if (!Number.isFinite(id)) redirect("/livreur")
  const order = await getLivreurOrder(id)
  if (!order) redirect("/livreur")
  return <RunDeliveryClient order={order} />
}
