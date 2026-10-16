import { getSetting } from "@/app/actions/settings"
import { NavbarClient } from "@/components/navbar-client"
import { BRAND_NAME, publicText } from "@/lib/brand"

type UserData = { pseudo?: string; token?: string } | null

export async function Navbar({ userData }: { userData?: UserData }) {
  const [capsule, nouveautes, siteName] = await Promise.all([
    getSetting("nav_label_capsule"),
    getSetting("nav_label_nouveautes"),
    getSetting("site_name"),
  ])

  const links = [
    { href: "/#capsule",    label: publicText(capsule, "Les classiques") },
    { href: "/#nouveautes", label: publicText(nouveautes, "Nouveautés") },
    { href: "/compte",      label: "Mon Compte" },
  ]

  return <NavbarClient links={links} userData={userData} siteName={publicText(siteName, BRAND_NAME)} />
}
