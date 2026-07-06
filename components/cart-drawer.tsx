"use client"

import { useState } from "react"
import { X, Minus, Plus, Trash2, Tag } from "lucide-react"
import { useCart } from "@/components/cart-provider"
import { formatPrice } from "@/lib/utils"

export function CartDrawer() {
  const {
    isOpen,
    closeCart,
    lines,
    updateQuantity,
    removeLine,
    subtotal,
    discount,
    totalPrice,
    promoCode,
    promoMessage,
    applyPromoCode,
    removePromoCode,
    checkout,
    checkoutState,
    checkoutMessage,
  } = useCart()

  const [codeInput, setCodeInput] = useState("")
  const [applying, setApplying] = useState(false)

  async function handleApplyCode() {
    if (!codeInput.trim()) return
    setApplying(true)
    await applyPromoCode(codeInput.trim())
    setApplying(false)
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/60 transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeCart}
        aria-hidden="true"
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-surface transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Panier"
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 className="font-display text-xl tracking-wide">Mon Panier</h2>
          <button onClick={closeCart} aria-label="Fermer le panier">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto p-4">
          {checkoutState === "success" ? (
            <div className="mt-10 text-center">
              <p className="font-display text-2xl text-violet-electric">Merci !</p>
              <p className="mt-2 font-mono text-sm text-ivory/60">{checkoutMessage}</p>
            </div>
          ) : lines.length === 0 ? (
            <p className="mt-10 text-center font-mono text-sm text-ivory/40">
              Ton panier est vide pour l'instant.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {lines.map((line) => (
                <li key={`${line.product.id}-${line.size}`} className="flex gap-3 border-b border-white/5 pb-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center bg-void">
                    <svg viewBox="0 0 100 100" className="h-8 w-8 text-violet-electric/40">
                      <path
                        d="M35 15 L50 8 L65 15 L78 25 L70 35 L65 30 L65 90 L35 90 L35 30 L30 35 L22 25 Z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-display text-sm tracking-wide">{line.product.name}</p>
                        <p className="font-mono text-[10px] uppercase text-ivory/40">Taille {line.size}</p>
                      </div>
                      <button
                        onClick={() => removeLine(line.product.id, line.size)}
                        aria-label="Retirer l'article"
                        className="text-ivory/40 hover:text-signal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 border border-white/15 px-2 py-1">
                        <button
                          onClick={() => updateQuantity(line.product.id, line.size, line.quantity - 1)}
                          aria-label="Diminuer la quantité"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="font-mono text-xs">{line.quantity}</span>
                        <button
                          onClick={() => updateQuantity(line.product.id, line.size, line.quantity + 1)}
                          aria-label="Augmenter la quantité"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="font-mono text-sm font-bold">
                        {formatPrice(line.product.price * line.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 && checkoutState !== "success" && (
          <div className="border-t border-white/10 p-4">
            {/* Promo code */}
            <div className="mb-4">
              {promoCode ? (
                <div className="flex items-center justify-between border border-violet-electric/40 bg-violet-electric/10 px-3 py-2">
                  <span className="flex items-center gap-2 font-mono text-xs text-violet-electric">
                    <Tag className="h-3.5 w-3.5" />
                    {promoCode}
                  </span>
                  <button onClick={removePromoCode} className="font-mono text-[10px] uppercase text-ivory/50 hover:text-signal">
                    Retirer
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    placeholder="Code promo"
                    className="min-w-0 flex-1 border border-white/15 bg-void px-3 py-2 font-mono text-xs uppercase text-ivory outline-none focus:border-violet-electric"
                  />
                  <button
                    onClick={handleApplyCode}
                    disabled={applying}
                    className="shrink-0 border border-white/20 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-ivory/80 hover:border-violet-electric hover:text-violet-electric disabled:opacity-50"
                  >
                    Appliquer
                  </button>
                </div>
              )}
              {promoMessage && !promoCode && (
                <p className="mt-1.5 font-mono text-[11px] text-signal">{promoMessage}</p>
              )}
            </div>

            <div className="mb-1 flex items-center justify-between font-mono text-xs text-ivory/50">
              <span>Sous-total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="mb-1 flex items-center justify-between font-mono text-xs text-violet-electric">
                <span>Réduction</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="mb-4 flex items-center justify-between font-mono text-sm">
              <span className="text-ivory/60">Total</span>
              <span className="text-lg font-bold text-violet-electric">{formatPrice(totalPrice)}</span>
            </div>

            {checkoutState === "error" && checkoutMessage && (
              <p className="mb-3 font-mono text-[11px] text-signal">{checkoutMessage}</p>
            )}

            <button
              onClick={checkout}
              disabled={checkoutState === "loading"}
              className="clip-tag w-full bg-violet-electric py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-void transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkoutState === "loading" ? "Envoi…" : "Passer commande"}
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
