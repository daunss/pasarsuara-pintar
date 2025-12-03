'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Link from 'next/link'

type Order = {
  id: string
  order_number: string
  status: string
  payment_status: string
  payment_method: string | null
  subtotal: number
  delivery_fee: number
  total_amount: number
  delivery_address: string
  delivery_notes: string
  created_at: string
  paid_at: string | null
  seller: {
    business_name: string
    avg_rating: number
  }
  order_items: Array<{
    product_name: string
    quantity: number
    unit_price: number
    subtotal: number
  }>
  deliveries: Array<{
    id: string
    tracking_number: string
    status: string
    provider: {
      name: string
    }
  }>
}

function OrderDetailContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params.id as string
  const paymentStatus = searchParams.get('status')
  const { user } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchOrder()
    }
  }, [user, orderId])

  const fetchOrder = async () => {
    if (!user) return

    try {
      // Try to find by order_number first, then by id
      let query = supabase
        .from('orders')
        .select(`
          *,
          seller:seller_profiles(business_name, avg_rating),
          order_items(*),
          deliveries(
            id,
            tracking_number,
            status,
            provider:delivery_providers(name)
          )
        `)
        .eq('buyer_id', user.id)

      // Check if orderId is UUID or order_number
      if (orderId.includes('-') && orderId.length > 30) {
        query = query.eq('id', orderId)
      } else {
        query = query.eq('order_number', orderId)
      }

      const { data, error } = await query.single()

      if (error) throw error
      setOrder(data)
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-purple-100 text-purple-800',
      SHIPPED: 'bg-indigo-100 text-indigo-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      REFUNDED: 'bg-gray-100 text-gray-800'
    }
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  const getPaymentStatusBadge = (status: string) => {
    const badges = {
      PAID: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      FAILED: 'bg-red-100 text-red-800',
      REFUNDED: 'bg-gray-100 text-gray-800'
    }
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat detail pesanan...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold mb-2">Pesanan tidak ditemukan</h3>
          <Link href="/orders" className="text-green-600 hover:underline">
            Kembali ke Daftar Pesanan
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/orders" className="text-green-600 hover:text-green-700">
              ← Kembali
            </Link>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">Detail Pesanan</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Payment Success Alert */}
          {paymentStatus === 'success' && (
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 text-center">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-2xl font-bold text-green-800 mb-2">Pembayaran Berhasil!</h2>
              <p className="text-green-700">
                Terima kasih! Pesanan Anda sedang diproses.
              </p>
            </div>
          )}

          {paymentStatus === 'pending' && (
            <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-6 text-center">
              <div className="text-5xl mb-3">⏳</div>
              <h2 className="text-2xl font-bold text-yellow-800 mb-2">Pembayaran Pending</h2>
              <p className="text-yellow-700">
                Silakan selesaikan pembayaran Anda.
              </p>
            </div>
          )}

          {/* Order Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold mb-2">📦 {order.order_number}</h1>
                <p className="text-gray-600">{formatDate(order.created_at)}</p>
              </div>
              <div className="flex gap-2">
                <span className={`px-4 py-2 rounded-full font-semibold ${getStatusBadge(order.status)}`}>
                  {order.status}
                </span>
                <span className={`px-4 py-2 rounded-full font-semibold ${getPaymentStatusBadge(order.payment_status)}`}>
                  💳 {order.payment_status}
                </span>
              </div>
            </div>

            {/* Seller Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🏪</div>
                <div>
                  <div className="font-semibold">{order.seller.business_name}</div>
                  {order.seller.avg_rating > 0 && (
                    <div className="text-sm text-gray-600">
                      ⭐ {order.seller.avg_rating.toFixed(1)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Produk yang Dipesan</h3>
              <div className="space-y-3">
                {order.order_items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center pb-3 border-b last:border-0">
                    <div>
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-sm text-gray-600">
                        {item.quantity} × {formatCurrency(item.unit_price)}
                      </div>
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Summary */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Ongkir</span>
                <span>{order.delivery_fee === 0 ? 'Gratis' : formatCurrency(order.delivery_fee)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-green-600">{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          {order.deliveries && order.deliveries.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">🚚 Informasi Pengiriman</h2>
              
              {order.deliveries.map((delivery) => (
                <div key={delivery.id}>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    {delivery.provider && (
                      <div>
                        <p className="text-sm text-gray-600">Kurir</p>
                        <p className="font-semibold">{delivery.provider.name}</p>
                      </div>
                    )}
                    {delivery.tracking_number && (
                      <div>
                        <p className="text-sm text-gray-600">No. Resi</p>
                        <p className="font-semibold">{delivery.tracking_number}</p>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Status Pengiriman</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                      delivery.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                      delivery.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {delivery.status}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Alamat Pengiriman</p>
                    <p className="font-medium">{order.delivery_address}</p>
                  </div>

                  <Link
                    href={`/delivery/${delivery.id}`}
                    className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                  >
                    Lacak Pengiriman
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Payment Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">💳 Informasi Pembayaran</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusBadge(order.payment_status)}`}>
                  {order.payment_status}
                </span>
              </div>
              
              {order.payment_method && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Metode</span>
                  <span className="font-medium capitalize">
                    {order.payment_method.replace('_', ' ')}
                  </span>
                </div>
              )}

              {order.paid_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Dibayar pada</span>
                  <span className="font-medium">{formatDate(order.paid_at)}</span>
                </div>
              )}

              <div className="flex justify-between text-lg font-bold pt-3 border-t">
                <span>Total Dibayar</span>
                <span className="text-green-600">{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Link
              href="/orders"
              className="flex-1 text-center bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              Kembali ke Pesanan
            </Link>
            {order.status === 'DELIVERED' && (
              <button
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                onClick={() => alert('Fitur review akan segera tersedia')}
              >
                Beri Ulasan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrderDetailPage() {
  return (
    <ProtectedRoute>
      <OrderDetailContent />
    </ProtectedRoute>
  )
}
