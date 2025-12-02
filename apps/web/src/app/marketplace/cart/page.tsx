'use client'

import { useCart } from '@/lib/cart'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CartPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { items, removeItem, updateQuantity, getTotalAmount } = useCart()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const handleCheckout = () => {
    if (!user) {
      router.push('/login')
      return
    }
    router.push('/marketplace/checkout')
  }

  // Group items by seller
  const itemsBySeller = items.reduce((acc, item) => {
    if (!acc[item.sellerId]) {
      acc[item.sellerId] = {
        sellerName: item.sellerName,
        items: []
      }
    }
    acc[item.sellerId].items.push(item)
    return acc
  }, {} as Record<string, { sellerName: string; items: typeof items }>)

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/marketplace" className="text-green-600 hover:text-green-700">
                ← Marketplace
              </Link>
              {user && (
                <Link href="/dashboard" className="text-sm text-gray-600 hover:text-green-600">
                  Dashboard
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Empty State */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="text-8xl mb-6">🛒</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Keranjang Kosong</h2>
            <p className="text-gray-600 mb-8">Belum ada produk di keranjang Anda</p>
            <Link
              href="/marketplace"
              className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700"
            >
              Mulai Belanja
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/marketplace" className="text-green-600 hover:text-green-700">
                ← Marketplace
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">Keranjang Belanja</span>
            </div>
            {user && (
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-green-600">
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">🛒 Keranjang Belanja</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {Object.entries(itemsBySeller).map(([sellerId, { sellerName, items: sellerItems }]) => (
              <div key={sellerId} className="bg-white rounded-lg shadow">
                {/* Seller Header */}
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏪</span>
                    <span className="font-semibold">{sellerName}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y">
                  {sellerItems.map((item) => (
                    <div key={item.listingId} className="p-4">
                      <div className="flex gap-4">
                        {/* Product Image Placeholder */}
                        <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                          📦
                        </div>

                        {/* Product Info */}
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                          <p className="text-green-600 font-semibold mb-2">
                            {formatCurrency(item.price)}/{item.unit}
                          </p>

                          <div className="flex items-center justify-between">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.listingId, item.quantity - 1)}
                                className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300"
                              >
                                -
                              </button>
                              <span className="w-12 text-center font-medium">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.listingId, item.quantity + 1)}
                                className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300"
                              >
                                +
                              </button>
                            </div>

                            {/* Subtotal & Remove */}
                            <div className="text-right">
                              <div className="font-bold text-lg text-gray-800 mb-1">
                                {formatCurrency(item.price * item.quantity)}
                              </div>
                              <button
                                onClick={() => removeItem(item.listingId)}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                Hapus
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4">Ringkasan Belanja</h2>

              <div className="space-y-3 mb-4 pb-4 border-b">
                <div className="flex justify-between text-gray-600">
                  <span>Total Produk</span>
                  <span>{items.reduce((sum, item) => sum + item.quantity, 0)} item</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(getTotalAmount())}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Ongkir</span>
                  <span className="text-sm">Dihitung di checkout</span>
                </div>
              </div>

              <div className="flex justify-between text-xl font-bold mb-6">
                <span>Total</span>
                <span className="text-green-600">{formatCurrency(getTotalAmount())}</span>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Lanjut ke Checkout
              </button>

              <Link
                href="/marketplace"
                className="block text-center mt-4 text-green-600 hover:underline"
              >
                Lanjut Belanja
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
