'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Link from 'next/link'

type Delivery = {
  id: string
  tracking_number: string
  status: string
  delivery_address: string
  recipient_name: string
  recipient_phone: string
  delivery_fee: number
  estimated_delivery: string
  actual_delivery: string
  created_at: string
  provider: {
    name: string
    description: string
  }
  order: {
    order_number: string
    total_amount: number
  }
}

type StatusHistory = {
  id: string
  status: string
  location: string
  notes: string
  created_at: string
}

function DeliveryTrackingContent() {
  const params = useParams()
  const deliveryId = params.id as string
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [history, setHistory] = useState<StatusHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDelivery()
    fetchHistory()
  }, [deliveryId])

  const fetchDelivery = async () => {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          provider:delivery_providers(name, description),
          order:orders(order_number, total_amount)
        `)
        .eq('id', deliveryId)
        .single()

      if (error) throw error
      setDelivery(data)
    } catch (error) {
      console.error('Error fetching delivery:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_status_history')
        .select('*')
        .eq('delivery_id', deliveryId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setHistory(data || [])
    } catch (error) {
      console.error('Error fetching history:', error)
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
      PICKED_UP: 'bg-blue-100 text-blue-800',
      IN_TRANSIT: 'bg-purple-100 text-purple-800',
      OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-800',
      DELIVERED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      RETURNED: 'bg-gray-100 text-gray-800'
    }
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string) => {
    const texts = {
      PENDING: 'Menunggu Pickup',
      PICKED_UP: 'Sudah Diambil',
      IN_TRANSIT: 'Dalam Perjalanan',
      OUT_FOR_DELIVERY: 'Sedang Dikirim',
      DELIVERED: 'Terkirim',
      FAILED: 'Gagal',
      RETURNED: 'Dikembalikan'
    }
    return texts[status as keyof typeof texts] || status
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data pengiriman...</p>
        </div>
      </div>
    )
  }

  if (!delivery) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold mb-2">Pengiriman tidak ditemukan</h3>
          <Link href="/orders" className="text-green-600 hover:underline">
            Kembali ke Pesanan
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
            <span className="text-gray-600">Tracking Pengiriman</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Delivery Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold mb-2">📦 Tracking Pengiriman</h1>
                {delivery.tracking_number && (
                  <p className="text-gray-600">No. Resi: {delivery.tracking_number}</p>
                )}
              </div>
              <span className={`px-4 py-2 rounded-full font-semibold ${getStatusBadge(delivery.status)}`}>
                {getStatusText(delivery.status)}
              </span>
            </div>

            {/* Delivery Info */}
            <div className="grid md:grid-cols-2 gap-6 mb-6 pb-6 border-b">
              <div>
                <h3 className="font-semibold mb-2">Informasi Pengiriman</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Kurir:</span>
                    <span className="ml-2 font-medium">{delivery.provider.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Biaya:</span>
                    <span className="ml-2 font-medium">{formatCurrency(delivery.delivery_fee)}</span>
                  </div>
                  {delivery.estimated_delivery && (
                    <div>
                      <span className="text-gray-600">Estimasi:</span>
                      <span className="ml-2 font-medium">{formatDate(delivery.estimated_delivery)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Penerima</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Nama:</span>
                    <span className="ml-2 font-medium">{delivery.recipient_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Telepon:</span>
                    <span className="ml-2 font-medium">{delivery.recipient_phone}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Alamat:</span>
                    <p className="mt-1 font-medium">{delivery.delivery_address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Nomor Pesanan</p>
                  <p className="font-semibold">{delivery.order.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Pesanan</p>
                  <p className="font-semibold text-green-600">{formatCurrency(delivery.order.total_amount)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tracking History */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-6">Riwayat Pengiriman</h2>

            {history.length === 0 ? (
              <p className="text-gray-600 text-center py-8">Belum ada riwayat pengiriman</p>
            ) : (
              <div className="space-y-4">
                {history.map((item, index) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full ${index === 0 ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                      {index < history.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-300 my-1"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between mb-1">
                        <span className={`font-semibold ${index === 0 ? 'text-green-600' : 'text-gray-800'}`}>
                          {getStatusText(item.status)}
                        </span>
                        <span className="text-sm text-gray-500">{formatDate(item.created_at)}</span>
                      </div>
                      {item.location && (
                        <p className="text-sm text-gray-600 mb-1">📍 {item.location}</p>
                      )}
                      {item.notes && (
                        <p className="text-sm text-gray-600">{item.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DeliveryTrackingPage() {
  return (
    <ProtectedRoute>
      <DeliveryTrackingContent />
    </ProtectedRoute>
  )
}
