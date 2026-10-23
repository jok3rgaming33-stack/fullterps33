"use client"

// Petit bus d'événements côté client pour l'admin.
// Émis après chaque sauvegarde réussie dans les panneaux admin ; écouté par
// la « Vue client » (iframe de la vitrine) pour se recharger en temps réel.
// BroadcastChannel relaie aussi l'info aux autres onglets admin ouverts.

export const ADMIN_CHANGED_EVENT = "admin:changed"
const CHANNEL_NAME = "brumeco-admin"

export type AdminChange = { scope: string; at: number; source?: string }

// Identifiant de l'onglet : évite de recevoir deux fois ses propres événements
// (événement local + écho BroadcastChannel du même onglet).
const TAB_ID = Math.random().toString(36).slice(2)

export function notifyAdminChange(scope = "admin") {
  if (typeof window === "undefined") return
  const detail: AdminChange = { scope, at: Date.now(), source: TAB_ID }
  window.dispatchEvent(new CustomEvent<AdminChange>(ADMIN_CHANGED_EVENT, { detail }))
  try {
    const ch = new BroadcastChannel(CHANNEL_NAME)
    ch.postMessage(detail)
    ch.close()
  } catch { /* BroadcastChannel indisponible : l'événement local suffit */ }
}

export function onAdminChange(cb: (change: AdminChange) => void): () => void {
  if (typeof window === "undefined") return () => {}
  const local = (e: Event) => cb((e as CustomEvent<AdminChange>).detail ?? { scope: "admin", at: Date.now() })
  window.addEventListener(ADMIN_CHANGED_EVENT, local)
  let ch: BroadcastChannel | null = null
  try {
    ch = new BroadcastChannel(CHANNEL_NAME)
    ch.onmessage = (e) => {
      const change = e.data as AdminChange
      if (change?.source !== TAB_ID) cb(change)
    }
  } catch { ch = null }
  return () => {
    window.removeEventListener(ADMIN_CHANGED_EVENT, local)
    ch?.close()
  }
}
