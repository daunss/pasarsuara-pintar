'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface SellerMetrics {
  pending_orders: number
  total_sales: number
  active_listings: number
  today_orders: number
}

interface Order {
  id: string
  order_number: string
  status: string
  total_amount: number
  created_at: string
  buyer: {
    name: string
    email: string
  }
}

function SellerDashboardContent() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<SellerMetrics>({
    pending_orders: 0,
    total_sales: 0,
    active_listings: 0,
    today_orders: 0
  })
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchSellerData()
    }
  }, [user])

  const fetchSellerData = async () => {
    try {
      // Get seller profile
      const { data: sellerProfile } = await supabase
        .from('seller_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      if (!sellerProfile) {
        console.error('Seller profile not found')
        return
      }

      // Get orders for this seller
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          buyer:users!buyer_id(name, email)
        `)
        .eq('seller_id', sellerProfile.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (ordersError) throw ordersError

      setOrders(ordersData || [])

      // Calculate metrics
      const pendingOrders = ordersData?.filter(o => o.status === 'PENDING').length || 0
      const totalSales = ordersData?.reduce((sum, o) => sum + o.total_amount, 0) || 0
      
      // Get today's orders
      const today = new Date().toISOString().split('T')[0]
      const todayOrders = ordersData?.filter(o => 
        o.created_at.startsWith(today)
      ).length || 0

      // Get active listings
      const { data: listings } = await supabase
        .from('product_listings')
        .select('id')
        .eq('seller_id', sellerProfile.id)
        .eq('listing_status', 'ACTIVE')

      setMetrics({
        pending_orders: pendingOrders,
        total_sales: totalSales,
        active_listings: listings?.length || 0,
        today_orders: todayOrders
      })
    } catch (error) {
      console.error('Error fetching seller data:', error)
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-purple-100 text-purple-800',
      SHIPPED: 'bg-indigo-100 text-indigo-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat dashboard seller...</p>
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🏪 Seller Dashboard</h1>
              <p className="text-gray-600">Kelola pesanan dan produk Anda</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/seller/products"
                className="bg-white border-2 border-green-600 text-green-600 px-4 py-2 rounded-lg font-semibold hover:bg-green-50 transition"
              >
                Kelola Produk
              </Link>
              <Link
                href="/seller/orders"
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Lihat Semua Pesanan
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Metrics Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600 text-sm font-medium">Pesanan Pending</span>
              <span className="text-3xl">⏳</span>
            </div>
            <div className="text-3xl font-bold text-yellow-600">{metrics.pending_orders}</div>
            <p className="text-sm text-gray-500 mt-2">Perlu diproses</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600 text-sm font-medium">Total Penjualan</span>
              <span className="text-3xl">💰</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics.total_sales)}
            </div>
            <p className="text-sm text-gray-500 mt-2">Semua waktu</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600 text-sm font-medium">Produk Aktif</span>
              <span className="text-3xl">📦</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">{metrics.active_listings}</div>
            <p className="text-sm text-gray-500 mt-2">Sedang dijual</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600 text-sm font-medium">Pesanan Hari Ini</span>
              <span className="text-3xl">📊</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">{metrics.today_orders}</div>
            <p className="text-sm text-gray-500 mt-2">Pesanan baru</p>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Pesanan Terbaru</h2>
              <Link
                href="/seller/orders"
                className="text-green-600 hover:text-green-700 font-medium"
              >
                Lihat Semua →
              </Link>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-lg">Belum ada pesanan</p>
              <p className="text-sm mt-2">Pesanan akan muncul di sini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Pembeli
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{order.order_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{order.buyer?.name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{order.buyer?.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(order.total_amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/seller/orders/${order.id}`}
                          className="text-green-600 hover:text-green-700 font-medium"
                        >
                          Detail →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SellerDashboardPage() {
  return (
    <ProtectedRoute>
      <SellerDashboardContent />
    </ProtectedRoute>
  )
}
