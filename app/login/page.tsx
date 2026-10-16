"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Pas d'email/mot de passe : accès par jeton.
// L'accès se fait via token généré automatiquement sur /signup.
export default function LoginPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/signup")
  }, [router])
  return null
}
