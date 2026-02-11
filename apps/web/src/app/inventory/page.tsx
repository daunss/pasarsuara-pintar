'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { supabase } from '@/lib/supabase'
import { InventoryForm } from '@/components/inventory/InventoryForm'
import { BulkImport } from '@/components/inventory/BulkImport'
import { ShopeeImport } from '@/components/inventory/ShopeeImport'
import { PhotoImport } from '@/components/inventory/PhotoImport'

interface InventoryItem {
  id: string
  product_name: string
  stock_qty: number
  unit: string
  min_sell_price: number
  max_buy_price?: number
  description?: string
  created_at: string
}

function InventoryContent() {
  const { user } = useAuth()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [showShopeeImport, setShowShopeeImport] = useState(false)
  const [showPhotoImport, setShowPhotoImport] = useState(false)
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
    if (item.stock_qty === 0) {
      return { label: 'Habis', color: 'bg-red-100 text-red-800' }
    } else if (item.stock_qty <= 10) {
      return { label: 'Stok Rendah', color: 'bg-yellow-100 text-yellow-800' }
    } else {
      return { label: 'Tersedia', color: 'bg-forest/10 text-forest-dark' }
    }
  }

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  return (
    <div className="page-bg">
      {/* Header */}
      <header className="page-header">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-display text-charcoal">📦 Inventory Management</h1>
              <p className="text-sm sm:text-base text-muted">Kelola stok produk Anda</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => setShowShopeeImport(true)}
                className="bg-terra text-white px-3 sm:px-4 py-2 rounded-2xl text-sm sm:text-base font-semibold hover:bg-terra-dark transition flex items-center gap-1"
              >
                🛒 Import Shopee
              </button>
              <button
                onClick={() => setShowPhotoImport(true)}
                className="bg-terra-dark text-white px-3 sm:px-4 py-2 rounded-2xl text-sm sm:text-base font-semibold hover:bg-terra transition flex items-center gap-1"
              >
                📸 Foto Nota
              </button>
              <button
                onClick={() => setShowBulkImport(true)}
                className="bg-white border-2 border-terra text-terra px-3 sm:px-4 py-2 rounded-2xl text-sm sm:text-base font-semibold hover:bg-cream-light transition"
              >
                📥 Bulk Import
              </button>
              <button
                onClick={() => {
                  setSelectedItem(null)
                  setFormMode('create')
                  setShowForm(true)
                }}
                className="bg-forest text-white px-3 sm:px-4 py-2 rounded-2xl text-sm sm:text-base font-semibold hover:bg-forest-dark transition"
              >
                + Tambah Produk
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        {/* Filters */}
        <div className="card-warm p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                Cari Produk
              </label>
              <input
                type="text"
                placeholder="Nama produk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full input-warm focus:ring-2 focus:ring-terra/30 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <p className="text-sm text-muted">
                Total: {filteredInventory.length} produk
              </p>
            </div>
          </div>
        </div>

        {/* Inventory List */}
        {loading ? (
          <div className="card-warm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forest mx-auto mb-4"></div>
            <p className="text-muted">Memuat inventory...</p>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="card-warm p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold mb-2">Tidak ada produk</h3>
            <p className="text-muted mb-4">
              {searchTerm
                ? 'Tidak ada produk yang sesuai dengan pencarian'
                : 'Belum ada produk dalam inventory'}
            </p>
            <button
              onClick={() => {
                setSelectedItem(null)
                setFormMode('create')
                setShowForm(true)
              }}
              className="bg-forest text-white px-6 py-3 rounded-2xl font-semibold hover:bg-forest-dark transition"
            >
              Tambah Produk Pertama
            </button>
          </div>
        ) : (
          <div className="card-warm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-cream-light">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">
                      Produk
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">
                      Stok
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">
                      Satuan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">
                      Harga Jual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-dark">
                  {filteredInventory.map((item) => {
                    const status = getStockStatus(item)
                    return (
                      <tr key={item.id} className="hover:bg-cream-light">
                        <td className="px-6 py-4">
                          <div className="font-medium text-charcoal">{item.product_name}</div>
                          {item.description && (
                            <div className="text-sm text-muted truncate max-w-md">{item.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-lg font-semibold text-charcoal">
                            {item.stock_qty}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                          {item.unit || 'pcs'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal">
                          {item.min_sell_price ? formatCurrency(item.min_sell_price) : '-'}
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
                              className="text-terra hover:text-terra-dark font-medium"
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

      {/* Shopee Import Modal */}
      {showShopeeImport && (
        <ShopeeImport
          onComplete={() => {
            fetchInventory()
          }}
          onClose={() => setShowShopeeImport(false)}
        />
      )}

      {/* Photo Import Modal */}
      {showPhotoImport && (
        <PhotoImport
          onComplete={() => {
            setShowPhotoImport(false)
            fetchInventory()
          }}
          onClose={() => setShowPhotoImport(false)}
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
