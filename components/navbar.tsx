import { getSetting } from "@/app/actions/settings"
import { NavbarClient } from "@/components/navbar-client"

type UserData = { pseudo?: string; token?: string } | null

export async function Navbar({ userData }: { userData?: UserData }) {
  const [capsule, nouveautes] = await Promise.all([
    getSetting("nav_label_capsule"),
    getSetting("nav_label_nouveautes"),
  ])

  const links = [
    { href: "/#capsule",    label: (capsule    as string | null) ?? "Édition Capsule" },
    { href: "/#nouveautes", label: (nouveautes as string | null) ?? "Nouveautés"       },
    { href: "/compte",      label: "Mon Compte" },
  ]

  return <NavbarClient links={links} userData={userData} />
}
