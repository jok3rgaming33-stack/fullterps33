import { getActivePopup, type NewsItem } from "@/app/actions/settings"
import { NewsPopupClient } from "@/components/news-popup-client"

// Server Component — charge le popup actif et le passe au client
export async function NewsPopupLoader() {
  let popup: NewsItem | null = null
  try {
    popup = await getActivePopup()
  } catch {
    // pas de DB ou erreur — on ignore silencieusement
  }
  if (!popup) return null
  return <NewsPopupClient item={popup} />
}
