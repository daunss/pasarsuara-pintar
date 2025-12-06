'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'

interface UnsyncedInventory {
  id: string
  product_name: string
  quantity: number
  sell_price: number
  last_sync_at?: string
}

interface PendingReconciliation {
  id: string
  transaction_id: string
  payment_provider: string
  payment_reference: string
  expected_amount: number
  received_amount?: number
  status: string
  created_at: string
}

export default function SyncPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [unsyncedInventory, setUnsyncedInventory] = useState<UnsyncedInventory[]>([])
  const [pendingReconciliations, setPendingReconciliations] = useState<PendingReconciliation[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      const [inventoryRes, paymentsRes] = await Promise.all([
        fetch('/api/inventory/sync'),
        fetch('/api/payments/reconcile'),
      ])

      if (inventoryRes.ok) {
        const data = await inventoryRes.json()
        setUnsyncedInventory(data.unsynced || [])
      }

      if (paymentsRes.ok) {
        const data = await paymentsRes.json()
        setPendingReconciliations(data.pending || [])
      }
    } catch (error) {
      console.error('Error fetching sync data:', error)
    } finally {
      setLoading(false)
    }
  }

  const syncInventory = async (inventoryId: string) => {
    setSyncing(inventoryId)
    try {
      const response = await fetch('/api/inventory/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory_id: inventoryId }),
      })

      if (response.ok) {
        // Remove from unsynced list
        setUnsyncedInventory(prev => prev.filter(i => i.id !== inventoryId))
      }
    } catch (error) {
      console.error('Error syncing inventory:', error)
    } finally {
      setSyncing(null)
    }
  }

  const syncAllInventory = async () => {
    for (const item of unsyncedInventory) {
      await syncInventory(item.id)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
              <Link href="/dashboard" className="text-green-600 hover:text-green-700">
                ← Dashboard
              </Link>
              <span className="text-gray-400">|</span>
              <h1 className="text-xl font-bold text-gray-900">🔄 Sinkronisasi Data</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Inventory Belum Tersinkron</p>
                <p className="text-3xl font-bold text-yellow-600">{unsyncedInventory.length}</p>
              </div>
              <span className="text-4xl">📦</span>
            </div>
            {unsyncedInventory.length > 0 && (
              <button
                onClick={syncAllInventory}
                className="mt-4 w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                Sinkron Semua
              </button>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pembayaran Pending</p>
                <p className="text-3xl font-bold text-orange-600">{pendingReconciliations.length}</p>
              </div>
              <span className="text-4xl">💳</span>
            </div>
          </div>
        </div>

        {/* Unsynced Inventory */}
        {unsyncedInventory.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">📦 Inventory Belum Tersinkron</h2>
              <p className="text-sm text-gray-600 mt-1">
                Produk ini perlu disinkronkan ke marketplace
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Produk
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Stok
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Harga
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Terakhir Sync
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {unsyncedInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.quantity} unit</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCurrency(item.sell_price)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {item.last_sync_at
                            ? new Date(item.last_sync_at).toLocaleDateString('id-ID')
                            : 'Belum pernah'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => syncInventory(item.id)}
                          disabled={syncing === item.id}
                          className="text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                        >
                          {syncing === item.id ? 'Syncing...' : 'Sinkron →'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pending Reconciliations */}
        {pendingReconciliations.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">💳 Pembayaran Pending Rekonsiliasi</h2>
              <p className="text-sm text-gray-600 mt-1">
                Pembayaran ini perlu diverifikasi
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Referensi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Jumlah
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
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingReconciliations.map((recon) => (
                    <tr key={recon.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900">{recon.payment_reference}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{recon.payment_provider}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(recon.expected_amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          recon.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {recon.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(recon.created_at).toLocaleDateString('id-ID')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/payments/${recon.transaction_id}`}
                          className="text-green-600 hover:text-green-700 font-medium"
                        >
                          Verifikasi →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All Clear */}
        {unsyncedInventory.length === 0 && pendingReconciliations.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <span className="text-6xl mb-4 block">✅</span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Semua Tersinkron!</h2>
            <p className="text-gray-600">
              Tidak ada data yang perlu disinkronkan saat ini.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
