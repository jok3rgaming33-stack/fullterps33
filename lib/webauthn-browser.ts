"use client"

export type WebAuthnBrowserApi = {
  startRegistration: (opts: { optionsJSON: unknown }) => Promise<unknown>
  startAuthentication: (opts: { optionsJSON: unknown }) => Promise<{ id: string; [key: string]: unknown }>
  browserSupportsWebAuthn: () => boolean
}

let cached: WebAuthnBrowserApi | null | undefined

export async function loadWebAuthnBrowser(): Promise<WebAuthnBrowserApi | null> {
  if (cached !== undefined) return cached
  try {
    const mod = await import("@simplewebauthn/browser")
    if (typeof mod.startRegistration !== "function" || typeof mod.startAuthentication !== "function") {
      cached = null
      return null
    }
    cached = {
      startRegistration: mod.startRegistration as unknown as WebAuthnBrowserApi["startRegistration"],
      startAuthentication: mod.startAuthentication as unknown as WebAuthnBrowserApi["startAuthentication"],
      browserSupportsWebAuthn:
        typeof mod.browserSupportsWebAuthn === "function"
          ? mod.browserSupportsWebAuthn
          : () => typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined",
    }
    return cached
  } catch {
    cached = null
    return null
  }
}

export function browserSupportsWebAuthnSync(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined"
}
