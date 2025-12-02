'use client'

import { useState } from 'react'
import { useCart } from '@/lib/cart'
import { useAuth } from '@/lib/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function CheckoutContent() {
  const { user } = useAuth()
  const { items, getTotalAmount, clearCart } = useCart()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    delivery_address: '',
    delivery_notes: ''
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || items.length === 0) return

    setLoading(true)
    try {
      // Group items by seller
      const itemsBySeller = items.reduce((acc, item) => {
        if (!acc[item.sellerId]) {
          acc[item.sellerId] = []
        }
        acc[item.sellerId].push(item)
        return acc
      }, {} as Record<string, typeof items>)

      // Create orders for each seller
      for (const [sellerId, sellerItems] of Object.entries(itemsBySeller)) {
        const subtotal = sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
        const deliveryFee = 0 // TODO: Calculate delivery fee
        const totalAmount = subtotal + deliveryFee

        // Generate order number
        const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`

        // Create order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert([{
            buyer_id: user.id,
            seller_id: sellerId,
            order_number: orderNumber,
            status: 'PENDING',
            subtotal: subtotal,
            delivery_fee: deliveryFee,
            total_amount: totalAmount,
            delivery_address: formData.delivery_address,
            delivery_notes: formData.delivery_notes
          }])
          .select()
          .single()

        if (orderError) throw orderError

        // Create order items
        const orderItems = sellerItems.map(item => ({
          order_id: order.id,
          listing_id: item.listingId,
          product_name: item.title,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.price * item.quantity
        }))

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems)

        if (itemsError) throw itemsError

        // Create order status history
        await supabase
          .from('order_status_history')
          .insert([{
            order_id: order.id,
            status: 'PENDING',
            notes: 'Order created',
            created_by: user.id
          }])
      }

      // Clear cart
      clearCart()

      alert('Pesanan berhasil dibuat!')
      router.push('/orders')
    } catch (error) {
      console.error('Error creating order:', error)
      alert('Gagal membuat pesanan')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    router.push('/marketplace/cart')
    return null
  }

  const deliveryFee = 0 // TODO: Calculate based on location
  const totalAmount = getTotalAmount() + deliveryFee

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/marketplace/cart" className="text-green-600 hover:text-green-700">
                ← Keranjang
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">Checkout</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">📦 Checkout</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Delivery Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Informasi Pengiriman</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Alamat Pengiriman *</label>
                    <textarea
                      required
                      value={formData.delivery_address}
                      onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg"
                      rows={3}
                      placeholder="Jl. Contoh No. 123, Kelurahan, Kecamatan, Kota"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Catatan (Opsional)</label>
                    <textarea
                      value={formData.delivery_notes}
                      onChange={(e) => setFormData({ ...formData, delivery_notes: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg"
                      rows={2}
                      placeholder="Catatan untuk penjual atau kurir"
                    />
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Produk yang Dipesan</h2>
                
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.listingId} className="flex gap-4 pb-4 border-b last:border-0">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                        📦
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="text-sm text-gray-600">{item.sellerName}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantity} {item.unit} × {formatCurrency(item.price)}
                        </p>
                      </div>
                      <div className="text-right font-semibold">
                        {formatCurrency(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 sticky top-4">
                <h2 className="text-xl font-bold mb-4">Ringkasan Pesanan</h2>

                <div className="space-y-3 mb-4 pb-4 border-b">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatCurrency(getTotalAmount())}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Ongkir</span>
                    <span>{deliveryFee === 0 ? 'Gratis' : formatCurrency(deliveryFee)}</span>
                  </div>
                </div>

                <div className="flex justify-between text-xl font-bold mb-6">
                  <span>Total</span>
                  <span className="text-green-600">{formatCurrency(totalAmount)}</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                >
                  {loading ? 'Memproses...' : 'Buat Pesanan'}
                </button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Dengan membuat pesanan, Anda menyetujui syarat dan ketentuan kami
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <CheckoutContent />
    </ProtectedRoute>
  )
}
