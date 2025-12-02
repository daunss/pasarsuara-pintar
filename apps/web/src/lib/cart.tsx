'use client'

import { createContext, useContext, useState, useEffect } from 'react'

type CartItem = {
  listingId: string
  title: string
  price: number
  unit: string
  quantity: number
  sellerId: string
  sellerName: string
  maxStock: number
}

type CartContextType = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (listingId: string) => void
  updateQuantity: (listingId: string, quantity: number) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalAmount: () => number
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  getTotalItems: () => 0,
  getTotalAmount: () => 0
})

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart')
    if (savedCart) {
      setItems(JSON.parse(savedCart))
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items))
  }, [items])

  const addItem = (item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.listingId === item.listingId)
      if (existing) {
        // Update quantity if item exists
        return prev.map(i =>
          i.listingId === item.listingId
            ? { ...i, quantity: Math.min(i.quantity + item.quantity, item.maxStock) }
            : i
        )
      }
      // Add new item
      return [...prev, item]
    })
  }

  const removeItem = (listingId: string) => {
    setItems(prev => prev.filter(i => i.listingId !== listingId))
  }

  const updateQuantity = (listingId: string, quantity: number) => {
    setItems(prev =>
      prev.map(i =>
        i.listingId === listingId
          ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxStock)) }
          : i
      )
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const getTotalItems = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0)
  }

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotalItems,
        getTotalAmount
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
