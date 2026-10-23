"use client"

import { createContext, useContext } from "react"
import { BRAND_NAME } from "@/lib/brand"

const SignupBrandContext = createContext(BRAND_NAME)

/** Nom affiché sur la porte d'entrée. Déjà filtré côté serveur (texte légal, sinon le nom par défaut). */
export function SignupBrandProvider({ name, children }: { name: string; children: React.ReactNode }) {
  return <SignupBrandContext.Provider value={name}>{children}</SignupBrandContext.Provider>
}

export function useSignupBrand() {
  return useContext(SignupBrandContext)
}
