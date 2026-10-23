import { getSetting } from "@/app/actions/settings"
import { publicText } from "@/lib/brand"

/** Bandeau piloté par Réglages → « Statut boutique » (clés shop_open / shop_message). */
export async function ShopStatusBanner() {
  const [open, msg] = await Promise.all([getSetting("shop_open"), getSetting("shop_message")])
  const closed = open === false
  const message = publicText(msg, "")
  if (!closed && !message) return null

  return (
    <div
      role="status"
      className={`border-b px-4 py-2 text-center font-mono text-[11px] tracking-wide sm:text-xs ${
        closed ? "border-signal/30 bg-signal/10 text-signal" : "border-violet-electric/30 bg-violet-electric/10 text-ivory/90"
      }`}
    >
      {closed && <span className="font-bold uppercase tracking-widest">Boutique fermée pour le moment</span>}
      {closed && message && <span className="mx-2 opacity-50">·</span>}
      {message && <span>{message}</span>}
    </div>
  )
}
