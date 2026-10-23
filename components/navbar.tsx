import { getSetting } from "@/app/actions/settings"
import { NavbarClient } from "@/components/navbar-client"
import { isAdmin } from "@/lib/auth"
import { BRAND_NAME, visibleShopText } from "@/lib/brand"

type UserData = { pseudo?: string; token?: string } | null

export async function Navbar({ userData }: { userData?: UserData }) {
  const [capsule, nouveautes, siteName, admin] = await Promise.all([
    getSetting("nav_label_capsule"),
    getSetting("nav_label_nouveautes"),
    getSetting("site_name"),
    isAdmin(),
  ])
  const text = (value: unknown, fallback: string) => visibleShopText(value, fallback, admin)

  const links = [
    { href: "/#vedette",    label: text(capsule, "Les classiques") },
    { href: "/#nouveautes", label: text(nouveautes, "Nouveautés") },
    { href: "/compte",      label: "Mon Compte" },
  ]

  return <NavbarClient links={links} userData={userData} siteName={text(siteName, BRAND_NAME)} />
}
