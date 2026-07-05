"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import type { Product } from "@/lib/products"

export type CartLine = {
  product: Product
  size: string
  quantity: number
}

type CartContextValue = {
  lines: CartLine[]
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  addToCart: (product: Product, size: string) => void
  removeLine: (productId: string, size: string) => void
  updateQuantity: (productId: string, size: string, quantity: number) => void
  totalCount: number
  totalPrice: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [isOpen, setIsOpen] = useState(false)

  function addToCart(product: Product, size: string) {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id && l.size === size)
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id && l.size === size ? { ...l, quantity: l.quantity + 1 } : l,
        )
      }
      return [...prev, { product, size, quantity: 1 }]
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
  const totalPrice = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity * l.product.price, 0),
    [lines],
  )

  return (
    <CartContext.Provider
      value={{
        lines,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        addToCart,
        removeLine,
        updateQuantity,
        totalCount,
        totalPrice,
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
