"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import type { Product } from "@/lib/types"
import { validatePromoCode } from "@/app/actions/promo"
import { placeOrder } from "@/app/actions/orders"

export type CartLine = {
  product: Product
  size: string
  quantity: number
  /** Prix de la variante sélectionnée, en centimes */
  price: number
}

type CheckoutState = "idle" | "loading" | "success" | "error"

type CartContextValue = {
  lines: CartLine[]
  /** Alias for lines (BB33 compat) */
  items: CartLine[]
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  addToCart: (product: Product, size: string, price: number) => void
  removeLine: (productId: string, size: string) => void
  removeItem: (productId: string, size: string) => void
  updateQuantity: (productId: string, size: string, quantity: number) => void
  updateQty: (productId: string, size: string, quantity: number) => void
  clear: () => void
  totalCount: number
  subtotal: number
  discount: number
  totalPrice: number
  promoCode: string | null
  promoMessage: string | null
  applyPromoCode: (code: string) => Promise<void>
  removePromoCode: () => void
  checkout: () => Promise<void>
  checkoutState: CheckoutState
  checkoutMessage: string | null
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [promoCode, setPromoCode] = useState<string | null>(null)
  const [discount, setDiscount] = useState(0)
  const [promoMessage, setPromoMessage] = useState<string | null>(null)
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle")
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)

  function addToCart(product: Product, size: string, price: number) {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id && l.size === size)
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id && l.size === size ? { ...l, quantity: l.quantity + 1 } : l,
        )
      }
      return [...prev, { product, size, quantity: 1, price }]
    })
    setIsOpen(true)
  }

  function removeLine(productId: string, size: string) {
    setLines((prev) => prev.filter((l) => !(l.product.id === productId && l.size === size)))
  }

  function updateQuantity(productId: string, size: string, quantity: number) {
    if (quantity < 1) {
      removeLine(productId, size)
      return
    }
    setLines((prev) =>
      prev.map((l) => (l.product.id === productId && l.size === size ? { ...l, quantity } : l)),
    )
  }

  const totalCount = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines])
  const subtotal = useMemo(() => lines.reduce((sum, l) => sum + l.quantity * l.price, 0), [lines])
  const totalPrice = Math.max(0, subtotal - discount)

  async function applyPromoCode(code: string) {
    const result = await validatePromoCode(code, subtotal)
    setPromoMessage(result.message)
    if (result.ok) {
      setPromoCode(result.code ?? code.toUpperCase())
      setDiscount(result.discount ?? 0)
    } else {
      setPromoCode(null)
      setDiscount(0)
    }
  }

  function removePromoCode() {
    setPromoCode(null)
    setDiscount(0)
    setPromoMessage(null)
  }

  function clear() {
    setLines([])
    setPromoCode(null)
    setDiscount(0)
    setPromoMessage(null)
    setCheckoutState("idle")
    setCheckoutMessage(null)
  }

  async function checkout() {
    setCheckoutState("loading")
    setCheckoutMessage(null)
    try {
      const result = await placeOrder(
        lines.map((l) => ({
          productId: l.product.id,
          name: l.product.name,
          size: l.size,
          price: l.price,
          quantity: l.quantity,
        })),
        promoCode ?? undefined,
      )
      if (result.ok) {
        setCheckoutState("success")
        setCheckoutMessage("Commande passée avec succès !")
        setLines([])
        setPromoCode(null)
        setDiscount(0)
        setPromoMessage(null)
      } else {
        setCheckoutState("error")
        setCheckoutMessage(result.message)
      }
    } catch {
      setCheckoutState("error")
      setCheckoutMessage("Une erreur est survenue, réessayez.")
    }
  }

  return (
    <CartContext.Provider
      value={{
        lines,
        items: lines,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        addToCart,
        removeLine,
        removeItem: removeLine,
        updateQuantity,
        updateQty: updateQuantity,
        clear,
        totalCount,
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
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
