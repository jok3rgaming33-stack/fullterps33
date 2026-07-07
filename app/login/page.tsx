"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Le système FULLTERPS33 n'utilise pas d'email/password.
// L'accès se fait via token généré automatiquement sur /signup.
export default function LoginPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/signup")
  }, [router])
  return null
}
