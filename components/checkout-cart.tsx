"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { X, Trash2, MapPin, Tag, CalendarDays, Clock, Truck, Users, Check, Loader2, Minus, Plus } from "lucide-react"
import { useCart } from "@/components/cart-provider"
import { createOrderThread } from "@/app/actions/messaging"
import { validatePromoCode } from "@/app/actions/promo"
import { getCartConfig, type CartConfig, type DeliverySlot, type MeetupSlot } from "@/app/actions/settings"
import { needsVerification, submitVerification } from "@/app/actions/verification"
import { SelfieVerificationModal, type VerificationMetadata } from "@/components/selfie-verification-modal"
import { formatPrice } from "@/lib/utils"

type UserData = { pseudo?: string; token?: string } | null

type Props = {
  userData: UserData
  onOrderPlaced?: (msg: string) => void
}

const FEE_NEAR = 10
const FEE_FAR  = 20

const FALLBACK_CONFIG: CartConfig = {
  minDeliveryAmount: 50,
  deliverySlots: [
    { id: "d1", label: "14H - 17H", startHour: 14, endHour: 17 },
    { id: "d2", label: "18H - 20H", startHour: 18, endHour: 20 },
    { id: "d3", label: "21H - 02H", startHour: 21, endHour: 2  },
  ],
  meetupSlots: [
    { id: "m14", label: "14H", hour: 14 },
    { id: "m18", label: "18H", hour: 18 },
    { id: "m20", label: "20H", hour: 20 },
    { id: "m22", label: "22H", hour: 22 },
    { id: "m00", label: "00H", hour: 0  },
  ],
}

function dateOffset(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

function slotDate(dateStr: string, hour: number, afterMidnight: boolean) {
  const [y, m, d] = dateStr.split("-").map(Number)
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hour, 0, 0, 0)
  if (afterMidnight) dt.setDate(dt.getDate() + 1)
  return dt
}

function deliverySlotAvailable(dateStr: string, s: DeliverySlot, now: Date) {
  const crosses = s.endHour <= s.startHour
  return slotDate(dateStr, s.endHour, crosses).getTime() > now.getTime()
}

function meetupSlotAvailable(dateStr: string, s: MeetupSlot, now: Date) {
  const afterMidnight = s.hour < 12
  return slotDate(dateStr, s.hour, afterMidnight).getTime() > now.getTime()
}

export function CheckoutCart({ userData, onOrderPlaced }: Props) {
  const {
    lines, subtotal, updateQuantity, removeLine, clear,
    isOpen, closeCart,
    promoCode, promoMessage, applyPromoCode, removePromoCode,
    discount, totalPrice,
  } = useCart()

  const [address, setAddress]       = useState("")
  const [codeInput, setCodeInput]   = useState("")
  const [codeError, setCodeError]   = useState<string | null>(null)
  const [codeChecking, setCChecking] = useState(false)
  const [date, setDate]             = useState("")
  const [slot, setSlot]             = useState("")
  const [isMeetup, setIsMeetup]     = useState(false)
  const [meetupHour, setMeetupHour] = useState("")

  const [geoStatus, setGeoStatus]       = useState<"idle"|"loading"|"done"|"error"|"notfound">("idle")
  const [distanceKm, setDistanceKm]     = useState<number | null>(null)
  const [coords, setCoords]             = useState<{lat:number;lng:number}|null>(null)
  const [resolvedLabel, setResLabel]    = useState<string|null>(null)
  const [placed, setPlaced]             = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [submitError, setSubmitError]   = useState<string|null>(null)

  // KYC
  const [showVerif,     setShowVerif]     = useState(false)
  const [verifPending,  setVerifPending]  = useState(false)
  const [verifError,    setVerifError]    = useState<string|null>(null)

  const name = userData?.pseudo ?? "Invité"

  const { data: cfg } = useSWR("cart-config", () => getCartConfig(), {
    fallbackData: FALLBACK_CONFIG,
    revalidateOnFocus: false,
  })
  const config = cfg ?? FALLBACK_CONFIG

  const deliveryAllowed = subtotal >= config.minDeliveryAmount

  useEffect(() => {
    if (!deliveryAllowed && !isMeetup) setIsMeetup(true)
  }, [deliveryAllowed, isMeetup])

  const now = new Date()
  const availableDeliverySlots = useMemo(() => {
    if (!date) return config.deliverySlots
    return config.deliverySlots.filter((s) => deliverySlotAvailable(date, s, now))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.deliverySlots, date])
  const availableMeetupSlots = useMemo(() => {
    if (!date) return config.meetupSlots
    return config.meetupSlots.filter((s) => meetupSlotAvailable(date, s, now))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.meetupSlots, date])

  useEffect(() => {
    if (slot && !availableDeliverySlots.some((s) => s.label === slot)) setSlot("")
  }, [availableDeliverySlots, slot])
  useEffect(() => {
    if (meetupHour && !availableMeetupSlots.some((s) => s.label === meetupHour)) setMeetupHour("")
  }, [availableMeetupSlots, meetupHour])

  const deliveryFee = useMemo(() => {
    if (isMeetup || distanceKm == null) return 0
    return distanceKm <= 10 ? FEE_NEAR : FEE_FAR
  }, [isMeetup, distanceKm])

  const total = Math.max(0, subtotal + deliveryFee - discount)

  if (!isOpen) return null

  const applyCode = async () => {
    const code = codeInput.trim()
    if (!code || codeChecking) return
    setCChecking(true)
    setCodeError(null)
    try {
      const token = userData?.token
      await applyPromoCode(code)
      setCodeInput("")
    } catch {
      setCodeError("Impossible de vérifier ce code.")
    } finally {
      setCChecking(false)
    }
  }

  const checkAddress = async () => {
    if (!address.trim()) return
    setGeoStatus("loading")
    setResLabel(null)
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`)
      const data = await res.json()
      if (res.ok && data.found) {
        setDistanceKm(Number(data.distanceKm))
        setCoords(typeof data.lat === "number" ? { lat: data.lat, lng: data.lng } : null)
        setResLabel(data.label ?? null)
        setGeoStatus("done")
      } else if (res.ok && data.found === false) {
        setDistanceKm(null); setCoords(null); setGeoStatus("notfound")
      } else {
        setDistanceKm(null); setCoords(null); setGeoStatus("error")
      }
    } catch {
      setDistanceKm(null); setCoords(null); setGeoStatus("error")
    }
  }

  const canValidate =
    lines.length > 0 &&
    !!date &&
    (isMeetup ? !!meetupHour : !!address.trim() && !!slot)

  const placeOrder = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const summary = lines
        .map((l) => `${l.quantity}× ${l.product.name} (${l.size})`)
        .join(" + ")

      const result = await createOrderThread({
        customerName: name,
        customerToken: userData?.token,
        summary: `Commande de ${name} : ${summary}`,
        products: summary,
        total,
        fulfillment: isMeetup ? "meetup" : "livraison",
        address: isMeetup ? undefined : (resolvedLabel ?? address),
        lat:  isMeetup ? undefined : coords?.lat,
        lng:  isMeetup ? undefined : coords?.lng,
        scheduledDate: date,
        scheduledSlot: isMeetup ? meetupHour : slot,
      })

      if (result) {
        setPlaced(true)
        clear()
        onOrderPlaced?.(`Commande #${result.id} enregistrée ! Suis-la dans Messagerie.`)
      } else {
        setSubmitError("Erreur lors de l'enregistrement, réessaie.")
      }
    } catch {
      setSubmitError("Une erreur est survenue.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleValidate = async () => {
    if (!canValidate || submitting) return
    // Auto-géocodage si adresse saisie mais pas encore vérifiée
    if (!isMeetup && distanceKm == null && address.trim()) {
      await checkAddress()
      // checkAddress met à jour distanceKm de manière asynchrone via setState
      // On re-déclenche après le prochain rendu via un flag — on sort ici
      setSubmitError("Adresse vérifiée — clique à nouveau sur Passer commande.")
      return
    }
    const token = userData?.token
    // Vérifie si la vérification KYC est nécessaire
    const required = await needsVerification(token)
    if (required) {
      setShowVerif(true)
      return
    }
    await placeOrder()
  }

  const handleVerificationComplete = async (photo: File, video: File, _meta: VerificationMetadata) => {
    const token = userData?.token
    if (!token) { setVerifError("Session expirée. Reconnecte-toi."); return }
    setVerifPending(true)
    setVerifError(null)
    try {
      const upload = async (file: File, kind: "photo" | "video") => {
        const fd = new FormData()
        fd.append("file", file)
        fd.append("token", token)
        fd.append("kind", kind)
        const res = await fetch("/api/verification/upload", { method: "POST", body: fd })
        if (!res.ok) throw new Error(`Upload ${kind} échoué`)
        const data = await res.json()
        return data.pathname as string
      }
      const [photoPathname, videoPathname] = await Promise.all([upload(photo, "photo"), upload(video, "video")])
      const saved = await submitVerification({ token, photoPathname, videoPathname })
      if (!saved.ok) { setVerifError(saved.error ?? "Échec de l'enregistrement."); return }
      setShowVerif(false)
      // Passe la commande maintenant que la vérification est soumise
      await placeOrder()
    } catch {
      setVerifError("Échec de l'envoi des fichiers. Réessaie.")
    } finally {
      setVerifPending(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 transition-opacity"
        onClick={closeCart}
        aria-hidden="true"
      />
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-surface transition-transform duration-300"
        aria-label="Panier"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 className="font-display text-xl tracking-wide">Mon Panier</h2>
          <button onClick={closeCart} aria-label="Fermer le panier">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto p-4">
          {placed ? (
            <div className="mt-16 text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-violet-electric/20">
                <Check className="h-7 w-7 text-violet-electric" />
              </div>
              <p className="font-display text-2xl text-violet-electric">Merci !</p>
              <p className="mt-2 font-mono text-sm text-ivory/60">
                Ta commande a été enregistrée. Suis-la dans la Messagerie.
              </p>
            </div>
          ) : lines.length === 0 ? (
            <p className="mt-10 text-center font-mono text-sm text-ivory/40">
              Ton panier est vide pour l&apos;instant.
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Articles */}
              <ul className="flex flex-col gap-4">
                {lines.map((line) => (
                  <li key={`${line.product.id}-${line.size}`} className="flex gap-3 border-b border-white/5 pb-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center bg-void">
                      <svg viewBox="0 0 100 100" className="h-8 w-8 text-violet-electric/40">
                        <path d="M35 15 L50 8 L65 15 L78 25 L70 35 L65 30 L65 90 L35 90 L35 30 L30 35 L22 25 Z" fill="currentColor" />
                      </svg>
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-display text-sm tracking-wide">{line.product.name}</p>
                          <p className="font-mono text-[10px] uppercase text-ivory/40">Taille {line.size}</p>
                        </div>
                        <button onClick={() => removeLine(line.product.id, line.size)} aria-label="Retirer" className="text-ivory/40 hover:text-signal">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 border border-white/15 px-2 py-1">
                          <button onClick={() => updateQuantity(line.product.id, line.size, line.quantity - 1)} aria-label="Diminuer">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-mono text-xs">{line.quantity}</span>
                          <button onClick={() => updateQuantity(line.product.id, line.size, line.quantity + 1)} aria-label="Augmenter">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="font-mono text-sm font-bold">{formatPrice(line.product.price * line.quantity)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Code promo */}
              <div>
                {promoCode ? (
                  <div className="flex items-center justify-between border border-violet-electric/40 bg-violet-electric/10 px-3 py-2">
                    <span className="flex items-center gap-2 font-mono text-xs text-violet-electric">
                      <Tag className="h-3.5 w-3.5" />{promoCode}
                    </span>
                    <button onClick={removePromoCode} className="font-mono text-[10px] uppercase text-ivory/50 hover:text-signal">Retirer</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) applyCode() }}
                      placeholder="Code promo / fidélité"
                      className="min-w-0 flex-1 border border-white/15 bg-void px-3 py-2 font-mono text-xs uppercase text-ivory outline-none focus:border-violet-electric"
                    />
                    <button
                      onClick={applyCode}
                      disabled={codeChecking}
                      className="shrink-0 border border-white/20 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-ivory/80 hover:border-violet-electric hover:text-violet-electric disabled:opacity-50"
                    >
                      {codeChecking ? <Loader2 className="h-3 w-3 animate-spin" /> : "OK"}
                    </button>
                  </div>
                )}
                {(codeError || (promoMessage && !promoCode)) && (
                  <p className="mt-1.5 font-mono text-[11px] text-signal">{codeError ?? promoMessage}</p>
                )}
              </div>

              {/* Mode livraison */}
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ivory/40">Mode de réception</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setIsMeetup(false)}
                    disabled={!deliveryAllowed}
                    className={`flex items-center justify-center gap-2 border py-2.5 font-mono text-xs uppercase tracking-wide transition ${!isMeetup && deliveryAllowed ? "border-violet-electric bg-violet-electric/10 text-violet-electric" : "border-white/15 text-ivory/50 disabled:cursor-not-allowed"}`}
                  >
                    <Truck className="h-4 w-4" />
                    Livraison
                  </button>
                  <button
                    onClick={() => setIsMeetup(true)}
                    className={`flex items-center justify-center gap-2 border py-2.5 font-mono text-xs uppercase tracking-wide transition ${isMeetup ? "border-violet-electric bg-violet-electric/10 text-violet-electric" : "border-white/15 text-ivory/50"}`}
                  >
                    <Users className="h-4 w-4" />
                    Meet-up
                  </button>
                </div>
                {!deliveryAllowed && (
                  <p className="mt-1.5 font-mono text-[11px] text-ivory/40">
                    Livraison dès {formatPrice(config.minDeliveryAmount)} d&apos;achat
                  </p>
                )}
              </div>

              {/* Adresse (livraison) */}
              {!isMeetup && (
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ivory/40">Adresse de livraison</p>
                  <div className="flex gap-2">
                    <input
                      value={address}
                      onChange={(e) => { setAddress(e.target.value); setGeoStatus("idle"); setDistanceKm(null); setCoords(null) }}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) checkAddress() }}
                      placeholder="Numéro, rue, ville…"
                      className="min-w-0 flex-1 border border-white/15 bg-void px-3 py-2 font-mono text-xs text-ivory outline-none focus:border-violet-electric"
                    />
                    <button
                      onClick={checkAddress}
                      disabled={geoStatus === "loading" || !address.trim()}
                      className="shrink-0 border border-white/20 px-3 py-2 text-ivory/80 hover:border-violet-electric hover:text-violet-electric disabled:opacity-50"
                      aria-label="Vérifier l'adresse"
                    >
                      {geoStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                    </button>
                  </div>
                  {geoStatus === "done" && resolvedLabel && (
                    <p className="mt-1 font-mono text-[11px] text-violet-electric">
                      <Check className="mr-1 inline h-3 w-3" />{resolvedLabel} — {distanceKm} km
                      {distanceKm != null && (
                        <span className="ml-1 text-ivory/50">(+{distanceKm <= 10 ? FEE_NEAR : FEE_FAR}€)</span>
                      )}
                    </p>
                  )}
                  {geoStatus === "notfound" && <p className="mt-1 font-mono text-[11px] text-signal">Adresse introuvable, réessaie.</p>}
                  {geoStatus === "error"    && <p className="mt-1 font-mono text-[11px] text-signal">Erreur de géocodage, réessaie.</p>}
                </div>
              )}

              {/* Date */}
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ivory/40">
                  <CalendarDays className="mr-1 inline h-3 w-3" />Date souhaitée
                </p>
                <input
                  type="date"
                  value={date}
                  min={dateOffset(0)}
                  max={dateOffset(14)}
                  onChange={(e) => { setDate(e.target.value); setSlot(""); setMeetupHour("") }}
                  className="w-full border border-white/15 bg-void px-3 py-2 font-mono text-xs text-ivory outline-none focus:border-violet-electric [color-scheme:dark]"
                />
              </div>

              {/* Créneaux */}
              {date && (
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ivory/40">
                    <Clock className="mr-1 inline h-3 w-3" />Créneau horaire
                  </p>
                  {isMeetup ? (
                    <div className="flex flex-wrap gap-2">
                      {availableMeetupSlots.length === 0 ? (
                        <p className="font-mono text-[11px] text-ivory/40">Aucun créneau disponible ce jour.</p>
                      ) : availableMeetupSlots.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setMeetupHour(s.label)}
                          className={`border px-3 py-1.5 font-mono text-xs transition ${meetupHour === s.label ? "border-violet-electric bg-violet-electric/10 text-violet-electric" : "border-white/15 text-ivory/60 hover:border-violet-electric/50"}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableDeliverySlots.length === 0 ? (
                        <p className="font-mono text-[11px] text-ivory/40">Aucun créneau disponible ce jour.</p>
                      ) : availableDeliverySlots.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setSlot(s.label)}
                          className={`border px-3 py-1.5 font-mono text-xs transition ${slot === s.label ? "border-violet-electric bg-violet-electric/10 text-violet-electric" : "border-white/15 text-ivory/60 hover:border-violet-electric/50"}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {lines.length > 0 && !placed && (
          <div className="border-t border-white/10 p-4 space-y-2">
            <div className="flex items-center justify-between font-mono text-xs text-ivory/50">
              <span>Sous-total</span><span>{formatPrice(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex items-center justify-between font-mono text-xs text-violet-electric">
                <span>Réduction</span><span>-{formatPrice(discount)}</span>
              </div>
            )}
            {deliveryFee > 0 && (
              <div className="flex items-center justify-between font-mono text-xs text-ivory/50">
                <span>Livraison</span><span>+{formatPrice(deliveryFee)}</span>
              </div>
            )}
            <div className="flex items-center justify-between font-mono text-sm font-bold">
              <span className="text-ivory/70">Total</span>
              <span className="text-lg text-violet-electric">{formatPrice(total)}</span>
            </div>

            {submitError && <p className="font-mono text-[11px] text-signal">{submitError}</p>}

            <button
              onClick={handleValidate}
              disabled={!canValidate || submitting}
              className="clip-tag w-full bg-violet-electric py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-void transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Passer commande"}
            </button>
          </div>
        )}
      </aside>

      {showVerif && (
        <SelfieVerificationModal
          onComplete={handleVerificationComplete}
          onCancel={() => setShowVerif(false)}
          submitting={verifPending}
          submitError={verifError}
        />
      )}
    </>
  )
}
