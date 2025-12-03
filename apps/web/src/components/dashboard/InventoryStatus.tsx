'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'

interface InventoryItem {
  id: string
  product_name: string
  stock_qty: number
  unit: string
}

export function InventoryStatus({ lowStockThreshold = 10 }: { lowStockThreshold?: number }) {
  const { user } = useAuth()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchInventory()
    }
  }, [user])

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('user_id', user?.id)
        .order('stock_qty', { ascending: true })

      if (error) throw error
      setInventory(data || [])
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalProducts = inventory.length
  const lowStockItems = inventory.filter(item => item.stock_qty > 0 && item.stock_qty < lowStockThreshold)
  const outOfStockItems = inventory.filter(item => item.stock_qty === 0)

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Status Inventori</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Status Inventori</h3>
        <Link
          href="/inventory"
          className="text-sm text-green-600 hover:text-green-700 font-medium"
        >
          Kelola →
        </Link>
      </div>

      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{totalProducts}</div>
            <div className="text-xs text-blue-600 mt-1">Total Produk</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</div>
            <div className="text-xs text-yellow-600 mt-1">Stok Rendah</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{outOfStockItems.length}</div>
            <div className="text-xs text-red-600 mt-1">Habis</div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        {lowStockItems.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">⚠️ Perlu Restock</h4>
            <div className="space-y-2">
              {lowStockItems.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{item.product_name}</span>
                  <span className="text-yellow-600 font-medium">
                    {item.stock_qty} {item.unit}
                  </span>
                </div>
              ))}
              {lowStockItems.length > 3 && (
                <Link
                  href="/inventory"
                  className="text-sm text-green-600 hover:underline"
                >
                  +{lowStockItems.length - 3} lainnya
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Out of Stock Alerts */}
        {outOfStockItems.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">🚫 Stok Habis</h4>
            <div className="space-y-2">
              {outOfStockItems.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{item.product_name}</span>
                  <span className="text-red-600 font-medium">Habis</span>
                </div>
              ))}
              {outOfStockItems.length > 3 && (
                <Link
                  href="/inventory"
                  className="text-sm text-green-600 hover:underline"
                >
                  +{outOfStockItems.length - 3} lainnya
                </Link>
              )}
            </div>
          </div>
        )}

        {totalProducts === 0 && (
          <div className="text-center py-4 text-gray-500">
            <div className="text-3xl mb-2">📦</div>
            <p className="text-sm">Belum ada produk di inventori</p>
            <Link
              href="/inventory"
              className="text-sm text-green-600 hover:underline mt-2 inline-block"
            >
              Tambah Produk
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
