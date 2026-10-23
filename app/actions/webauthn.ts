"use server"

import { createHash, randomBytes } from "crypto"
import { headers } from "next/headers"
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server"
import { isoBase64URL } from "@simplewebauthn/server/helpers"
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from "@simplewebauthn/server"
import { sql } from "@/lib/db"
import { getCustomerToken, setCustomerSession } from "@/lib/auth"
import { BRAND_NAME } from "@/lib/brand"
import { customerHasPush } from "@/app/actions/push"

const CHALLENGE_TTL_MS = 5 * 60 * 1000
let schemaReady = false

async function ensureWebAuthnSchema(): Promise<boolean> {
  if (schemaReady) return true
  try {
    await sql`
      create table if not exists webauthn_credentials (
        id serial primary key,
        user_token text not null,
        credential_id text not null unique,
        public_key text not null,
        counter integer not null default 0,
        transports text,
        device_label text,
        created_at timestamptz not null default now()
      )
    `
    await sql`
      create index if not exists webauthn_credentials_user_token_idx
      on webauthn_credentials (user_token)
    `
    await sql`
      create table if not exists webauthn_challenges (
        id text primary key,
        challenge text not null,
        user_token text,
        purpose text not null,
        expires_at timestamptz not null
      )
    `
    await sql`delete from webauthn_challenges where expires_at < now()`
    schemaReady = true
    return true
  } catch (e) {
    console.error("[webauthn] schema", e)
    return false
  }
}

async function rpConfig(): Promise<{ rpID: string; rpName: string; origins: string[] }> {
  const origins = new Set<string>()
  let host = "localhost"
  try {
    const h = await headers()
    host = (h.get("x-forwarded-host") || h.get("host") || "localhost").split(",")[0].trim()
    const proto = (h.get("x-forwarded-proto") || "https").split(",")[0].trim()
    if (host) origins.add(`${proto}://${host}`)
  } catch { /* hors requête */ }

  const hostname = host.replace(/:\d+$/, "")
  const local = hostname === "localhost" || hostname === "127.0.0.1"
  let rpID = hostname
  if (!local) {
    const parts = hostname.split(".")
    if (parts.length >= 2) rpID = parts.slice(-2).join(".")
    origins.add(`https://${rpID}`)
    origins.add(`https://www.${rpID}`)
  } else {
    rpID = "localhost"
    origins.add("http://localhost:3000")
    origins.add("http://127.0.0.1:3000")
  }

  return { rpID, rpName: BRAND_NAME, origins: [...origins] }
}

function tokenToUserId(token: string): Uint8Array {
  return new Uint8Array(createHash("sha256").update(token).digest())
}

async function saveChallenge(challenge: string, purpose: "registration" | "authentication", userToken?: string | null) {
  const id = randomBytes(16).toString("hex")
  const expires = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString()
  await sql`
    insert into webauthn_challenges (id, challenge, user_token, purpose, expires_at)
    values (${id}, ${challenge}, ${userToken ?? null}, ${purpose}, ${expires})
  `
  return id
}

async function consumeChallenge(id: string, purpose: "registration" | "authentication") {
  const rows = await sql`select * from webauthn_challenges where id = ${id} limit 1`
  await sql`delete from webauthn_challenges where id = ${id}`
  const row = rows[0]
  if (!row || row.purpose !== purpose) return null
  if (new Date(row.expires_at).getTime() < Date.now()) return null
  return { challenge: String(row.challenge), userToken: row.user_token ? String(row.user_token) : null }
}

function parseTransports(raw: string | null | undefined): AuthenticatorTransportFuture[] | undefined {
  if (!raw) return undefined
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean) as AuthenticatorTransportFuture[]
  return list.length ? list : undefined
}

export async function getConnectionPromptState(): Promise<{
  loggedIn: boolean
  needBio: boolean
  needPush: boolean
}> {
  const token = await getCustomerToken()
  if (!token) return { loggedIn: false, needBio: false, needPush: false }
  const [bio, push] = await Promise.all([customerWebAuthnEnabled(), customerHasPush()])
  return { loggedIn: true, needBio: !bio, needPush: !push }
}

export async function customerWebAuthnEnabled(): Promise<boolean> {
  const token = await getCustomerToken()
  if (!token) return false
  if (!(await ensureWebAuthnSchema())) return false
  const rows = await sql`select 1 from webauthn_credentials where user_token = ${token} limit 1`
  return rows.length > 0
}

export async function startCustomerWebAuthnRegistration(): Promise<
  { ok: true; options: unknown; challengeId: string } | { ok: false; error: string }
> {
  try {
    if (!(await ensureWebAuthnSchema())) return { ok: false, error: "Biométrie indisponible pour le moment." }
    const token = await getCustomerToken()
    if (!token) return { ok: false, error: "Connecte-toi avec ton token d'abord." }
    const account = await sql`select pseudo from users where token = ${token} limit 1`
    if (!account[0]) return { ok: false, error: "Compte introuvable." }

    const existing = await sql`select credential_id, transports from webauthn_credentials where user_token = ${token}`
    const { rpID, rpName } = await rpConfig()
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: String(account[0].pseudo),
      userDisplayName: String(account[0].pseudo),
      userID: tokenToUserId(token) as Uint8Array<ArrayBuffer>,
      attestationType: "none",
      excludeCredentials: existing.map((c: any) => ({
        id: String(c.credential_id),
        transports: parseTransports(c.transports),
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required",
      },
      timeout: 120000,
    })
    const challengeId = await saveChallenge(options.challenge, "registration", token)
    return { ok: true, options, challengeId }
  } catch (e) {
    console.error("[webauthn] startRegistration", e)
    return { ok: false, error: "Activation biométrique impossible sur cet appareil." }
  }
}

export async function finishCustomerWebAuthnRegistration(input: {
  challengeId: string
  response: RegistrationResponseJSON
  deviceLabel?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!(await ensureWebAuthnSchema())) return { ok: false, error: "Biométrie indisponible." }
    const token = await getCustomerToken()
    if (!token || !input.challengeId || !input.response) return { ok: false, error: "Données manquantes." }
    const stored = await consumeChallenge(input.challengeId, "registration")
    if (!stored || stored.userToken !== token) return { ok: false, error: "Délai dépassé. Réessaie." }

    const { rpID, origins } = await rpConfig()
    const verification = await verifyRegistrationResponse({
      response: input.response,
      expectedChallenge: stored.challenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
      requireUserVerification: true,
    })
    if (!verification.verified || !verification.registrationInfo) {
      return { ok: false, error: "Activation refusée par l'appareil." }
    }

    const { credential, credentialDeviceType } = verification.registrationInfo
    const transports = input.response.response.transports?.join(",") ?? credential.transports?.join(",") ?? null
    await sql`delete from webauthn_credentials where credential_id = ${credential.id}`
    await sql`
      insert into webauthn_credentials (user_token, credential_id, public_key, counter, transports, device_label)
      values (
        ${token},
        ${credential.id},
        ${isoBase64URL.fromBuffer(credential.publicKey)},
        ${credential.counter ?? 0},
        ${transports},
        ${(input.deviceLabel || credentialDeviceType || "appareil").slice(0, 80)}
      )
    `
    return { ok: true }
  } catch (e) {
    console.error("[webauthn] finishRegistration", e)
    return { ok: false, error: "Activation impossible. Tu peux toujours te connecter avec ton token." }
  }
}

export async function startCustomerWebAuthnAuthentication(): Promise<
  { ok: true; options: unknown; challengeId: string } | { ok: false; error: string }
> {
  try {
    if (!(await ensureWebAuthnSchema())) return { ok: false, error: "Biométrie indisponible." }
    const { rpID } = await rpConfig()
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "required",
      timeout: 120000,
    })
    const challengeId = await saveChallenge(options.challenge, "authentication")
    return { ok: true, options, challengeId }
  } catch (e) {
    console.error("[webauthn] startAuthentication", e)
    return { ok: false, error: "Connexion biométrique indisponible." }
  }
}

export async function finishCustomerWebAuthnAuthentication(input: {
  challengeId: string
  response: AuthenticationResponseJSON
}): Promise<{ ok: true; pseudo: string } | { ok: false; error: string }> {
  try {
    if (!(await ensureWebAuthnSchema())) return { ok: false, error: "Biométrie indisponible." }
    if (!input.challengeId || !input.response?.id) return { ok: false, error: "Données manquantes." }
    const stored = await consumeChallenge(input.challengeId, "authentication")
    if (!stored) return { ok: false, error: "Délai dépassé. Réessaie ou utilise ton token." }

    const credRows = await sql`
      select * from webauthn_credentials where credential_id = ${input.response.id} limit 1
    `
    const cred = credRows[0]
    if (!cred) return { ok: false, error: "Aucun appareil reconnu. Connecte-toi avec ton token." }

    const { rpID, origins } = await rpConfig()
    const verification = await verifyAuthenticationResponse({
      response: input.response,
      expectedChallenge: stored.challenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
      credential: {
        id: String(cred.credential_id),
        publicKey: isoBase64URL.toBuffer(String(cred.public_key)),
        counter: Math.max(0, Number(cred.counter ?? 0)),
        transports: parseTransports(cred.transports),
      },
      requireUserVerification: true,
    })
    if (!verification.verified) return { ok: false, error: "Vérification biométrique échouée." }

    const nextCounter = verification.authenticationInfo.newCounter
    if (typeof nextCounter === "number" && nextCounter >= Number(cred.counter ?? 0)) {
      await sql`update webauthn_credentials set counter = ${nextCounter} where credential_id = ${cred.credential_id}`
    }

    const account = await sql`select token, pseudo from users where token = ${cred.user_token} limit 1`
    if (!account[0]) return { ok: false, error: "Compte introuvable. Utilise ton token." }
    await setCustomerSession(String(account[0].token))
    return { ok: true, pseudo: String(account[0].pseudo ?? "") }
  } catch (e) {
    console.error("[webauthn] finishAuthentication", e)
    return { ok: false, error: "Déverrouillage impossible. Utilise ton token." }
  }
}
