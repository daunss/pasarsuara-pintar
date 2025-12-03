'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { supabase } from '@/lib/supabase'
import { InventoryForm } from '@/components/inventory/InventoryForm'
import { BulkImport } from '@/components/inventory/BulkImport'

interface InventoryItem {
  id: string
  product_name: string
  sku?: string
  current_stock: number
  min_stock_level: number
  max_stock_level?: number
  unit_price: number
  category?: string
  supplier?: string
  last_restocked?: string
  created_at: string
}

function InventoryContent() {
  const { user } = useAuth()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')

  useEffect(() => {
    if (user) {
      fetchInventory()
    }
  }, [user])

  const fetchInventory = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('inventory')
        .select('*')
        .eq('user_id', user?.id)
        .order('product_name', { ascending: true })

      const { data, error } = await query
      if (error) throw error
      
      setInventory(data || [])
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item)
    setFormMode('edit')
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus item ini dari inventory?')) return

    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      fetchInventory()
      alert('Item berhasil dihapus')
    } catch (error) {
      console.error('Error deleting inventory item:', error)
      alert('Gagal menghapus item')
    }
  }

  const handleSave = async (data: Partial<InventoryItem>) => {
    try {
      if (formMode === 'edit' && selectedItem) {
        const { error } = await supabase
          .from('inventory')
          .update(data)
          .eq('id', selectedItem.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('inventory')
          .insert({
            ...data,
            user_id: user?.id
          })

        if (error) throw error
      }

      setShowForm(false)
      setSelectedItem(null)
      fetchInventory()
      alert(formMode === 'edit' ? 'Item berhasil diupdate' : 'Item berhasil ditambahkan')
    } catch (error) {
      console.error('Error saving inventory item:', error)
      alert('Gagal menyimpan item')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock === 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' }
    } else if (item.current_stock <= item.min_stock_level) {
      return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' }
    } else {
      return { label: 'In Stock', color: 'bg-green-100 text-green-800' }
    }
  }

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const categories = Array.from(new Set(inventory.map(item => item.category).filter(Boolean)))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📦 Inventory Management</h1>
              <p className="text-gray-600">Kelola stok produk Anda</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkImport(true)}
                className="bg-white border-2 border-blue-600 text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition"
              >
                📥 Bulk Import
              </button>
              <button
                onClick={() => {
                  setSelectedItem(null)
                  setFormMode('create')
                  setShowForm(true)
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                + Tambah Produk
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cari Produk
              </label>
              <input
                type="text"
                placeholder="Nama produk atau SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="ALL">Semua Kategori</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Inventory List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat inventory...</p>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold mb-2">Tidak ada produk</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || categoryFilter !== 'ALL'
                ? 'Tidak ada produk yang sesuai dengan filter'
                : 'Belum ada produk dalam inventory'}
            </p>
            <button
              onClick={() => {
                setSelectedItem(null)
                setFormMode('create')
                setShowForm(true)
              }}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              Tambah Produk Pertama
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Produk
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Stok
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Min/Max
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Harga
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredInventory.map((item) => {
                    const status = getStockStatus(item)
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{item.product_name}</div>
                          {item.category && (
                            <div className="text-sm text-gray-500">{item.category}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.sku || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-lg font-semibold text-gray-900">
                            {item.current_stock}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {item.min_stock_level} / {item.max_stock_level || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-700 font-medium"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Inventory Form Modal */}
      {showForm && (
        <InventoryForm
          item={selectedItem}
          mode={formMode}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false)
            setSelectedItem(null)
          }}
        />
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <BulkImport
          onComplete={() => {
            setShowBulkImport(false)
            fetchInventory()
          }}
          onClose={() => setShowBulkImport(false)}
        />
      )}
    </div>
  )
}

export default function InventoryPage() {
  return (
    <ProtectedRoute>
      <InventoryContent />
    </ProtectedRoute>
  )
}
