'use client'

import { useState, useEffect } from 'react'
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
  created_at: string
  provider: {
    name: string
  }
  order: {
    order_number: string
    total_amount: number
    buyer: {
      name: string
    }
  }
}

function SellerDeliveriesContent() {
  const { user } = useAuth()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [selectedDeliveries, setSelectedDeliveries] = useState<string[]>([])

  const statuses = ['ALL', 'PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED']

  useEffect(() => {
    if (user) {
      fetchDeliveries()
    }
  }, [user, filterStatus])

  const fetchDeliveries = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get seller profile
      const { data: sellerProfile } = await supabase
        .from('seller_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!sellerProfile) {
        setLoading(false)
        return
      }

      // Get deliveries for seller's orders
      let query = supabase
        .from('deliveries')
        .select(`
          *,
          provider:delivery_providers(name),
          order:orders(
            order_number,
            total_amount,
            buyer:users(name)
          )
        `)
        .in('order_id', 
          supabase
            .from('orders')
            .select('id')
            .eq('seller_id', sellerProfile.id)
        )
        .order('created_at', { ascending: false })

      if (filterStatus !== 'ALL') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query

      if (error) throw error
      setDeliveries(data || [])
    } catch (error) {
      console.error('Error fetching deliveries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (deliveryId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({ status: newStatus })
        .eq('id', deliveryId)

      if (error) throw error

      // Add to status history
      await supabase
        .from('delivery_status_history')
        .insert([{
          delivery_id: deliveryId,
          status: newStatus,
          notes: `Status updated by seller`
        }])

      alert('Status berhasil diupdate!')
      fetchDeliveries()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Gagal update status')
    }
  }

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedDeliveries.length === 0) {
      alert('Pilih delivery terlebih dahulu')
      return
    }

    if (!confirm(`Update ${selectedDeliveries.length} delivery ke status ${newStatus}?`)) {
      return
    }

    try {
      // Update all selected deliveries
      const { error } = await supabase
        .from('deliveries')
        .update({ status: newStatus })
        .in('id', selectedDeliveries)

      if (error) throw error

      // Add to status history for each
      const historyRecords = selectedDeliveries.map(id => ({
        delivery_id: id,
        status: newStatus,
        notes: `Bulk update by seller`
      }))

      await supabase
        .from('delivery_status_history')
        .insert(historyRecords)

      alert(`${selectedDeliveries.length} delivery berhasil diupdate!`)
      setSelectedDeliveries([])
      fetchDeliveries()
    } catch (error) {
      console.error('Error bulk updating:', error)
      alert('Gagal bulk update')
    }
  }

  const toggleSelection = (deliveryId: string) => {
    setSelectedDeliveries(prev =>
      prev.includes(deliveryId)
        ? prev.filter(id => id !== deliveryId)
        : [...prev, deliveryId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedDeliveries.length === deliveries.length) {
      setSelectedDeliveries([])
    } else {
      setSelectedDeliveries(deliveries.map(d => d.id))
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
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/seller/dashboard" className="text-green-600 hover:text-green-700">
                ← Dashboard
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">Kelola Pengiriman</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🚚 Kelola Pengiriman</h1>
          <p className="text-gray-600">Kelola status pengiriman pesanan Anda</p>
        </div>

        {/* Filters & Bulk Actions */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
              {statuses.map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filterStatus === status
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status === 'ALL' ? 'Semua' : getStatusText(status)}
                </button>
              ))}
            </div>

            {/* Bulk Actions */}
            {selectedDeliveries.length > 0 && (
              <div className="flex gap-2 items-center">
                <span className="text-sm text-gray-600">
                  {selectedDeliveries.length} dipilih
                </span>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkStatusUpdate(e.target.value)
                      e.target.value = ''
                    }
                  }}
                  className="px-4 py-2 border rounded-lg text-sm"
                >
                  <option value="">Update Status</option>
                  <option value="PICKED_UP">Sudah Diambil</option>
                  <option value="IN_TRANSIT">Dalam Perjalanan</option>
                  <option value="OUT_FOR_DELIVERY">Sedang Dikirim</option>
                  <option value="DELIVERED">Terkirim</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Deliveries Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat data...</p>
          </div>
        ) : deliveries.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold mb-2">Belum ada pengiriman</h3>
            <p className="text-gray-600">Pengiriman akan muncul setelah ada pesanan</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedDeliveries.length === deliveries.length}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                      Order
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                      Penerima
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                      Kurir
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                      Tanggal
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {deliveries.map((delivery) => (
                    <tr key={delivery.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedDeliveries.includes(delivery.id)}
                          onChange={() => toggleSelection(delivery.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-semibold text-sm">
                            {delivery.order.order_number}
                          </div>
                          <div className="text-xs text-gray-600">
                            {delivery.order.buyer.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-medium">
                            {delivery.recipient_name}
                          </div>
                          <div className="text-xs text-gray-600">
                            {delivery.recipient_phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">{delivery.provider.name}</div>
                        {delivery.tracking_number && (
                          <div className="text-xs text-gray-600">
                            {delivery.tracking_number}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(delivery.status)}`}>
                          {getStatusText(delivery.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatDate(delivery.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <Link
                            href={`/delivery/${delivery.id}`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Detail
                          </Link>
                          {delivery.status !== 'DELIVERED' && (
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleStatusUpdate(delivery.id, e.target.value)
                                  e.target.value = ''
                                }
                              }}
                              className="text-sm border rounded px-2 py-1"
                            >
                              <option value="">Update</option>
                              {delivery.status === 'PENDING' && (
                                <option value="PICKED_UP">Diambil</option>
                              )}
                              {['PENDING', 'PICKED_UP'].includes(delivery.status) && (
                                <option value="IN_TRANSIT">Dalam Perjalanan</option>
                              )}
                              {['PENDING', 'PICKED_UP', 'IN_TRANSIT'].includes(delivery.status) && (
                                <option value="OUT_FOR_DELIVERY">Sedang Dikirim</option>
                              )}
                              <option value="DELIVERED">Terkirim</option>
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SellerDeliveriesPage() {
  return (
    <ProtectedRoute>
      <SellerDeliveriesContent />
    </ProtectedRoute>
  )
}
