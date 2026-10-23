"use client"

import { createContext, useContext } from "react"
import type { SiteRule } from "@/lib/site-rules"

const SiteRulesContext = createContext<SiteRule[]>([])

export function SiteRulesProvider({ rules, children }: { rules: SiteRule[]; children: React.ReactNode }) {
  return <SiteRulesContext.Provider value={rules}>{children}</SiteRulesContext.Provider>
}

export function useSiteRules() {
  return useContext(SiteRulesContext)
}
