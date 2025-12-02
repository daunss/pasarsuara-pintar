'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function NewProductContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sellerId, setSellerId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Makanan',
    price: '',
    unit: 'kg',
    min_order_qty: '1',
    stock_qty: '',
    listing_status: 'ACTIVE'
  })

  const categories = ['Makanan', 'Minuman', 'Bahan Baku', 'Peralatan', 'Lainnya']
  const units = ['kg', 'gram', 'liter', 'ml', 'pcs', 'pack', 'box', 'karung', 'porsi']

  useEffect(() => {
    if (user) {
      fetchSellerProfile()
    }
  }, [user])

  const fetchSellerProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('seller_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setSellerId(data.id)
    } catch (error) {
      console.error('Error fetching seller profile:', error)
      alert('Anda belum terdaftar sebagai seller')
      router.push('/seller/dashboard')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sellerId) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('product_listings')
        .insert([{
          seller_id: sellerId,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          price: parseFloat(formData.price),
          unit: formData.unit,
          min_order_qty: parseInt(formData.min_order_qty),
          stock_qty: parseInt(formData.stock_qty),
          listing_status: formData.listing_status
        }])

      if (error) throw error

      alert('Produk berhasil ditambahkan!')
      router.push('/seller/dashboard')
    } catch (error) {
      console.error('Error creating listing:', error)
      alert('Gagal menambahkan produk')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/seller/dashboard" className="text-green-600 hover:text-green-700">
                ← Seller Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Tambah Produk Baru</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-2">Nama Produk *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg"
                  placeholder="Beras Premium 5kg"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">Deskripsi *</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg"
                  rows={4}
                  placeholder="Deskripsi produk Anda..."
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-2">Kategori *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Price & Unit */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Harga *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="100"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg"
                    placeholder="50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Satuan *</label>
                  <select
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg"
                  >
                    {units.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Min Order & Stock */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Min. Order *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.min_order_qty}
                    onChange={(e) => setFormData({ ...formData, min_order_qty: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Stok *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stock_qty}
                    onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg"
                    placeholder="100"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-2">Status *</label>
                <select
                  required
                  value={formData.listing_status}
                  onChange={(e) => setFormData({ ...formData, listing_status: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg"
                >
                  <option value="DRAFT">Draft (Belum Dipublikasi)</option>
                  <option value="ACTIVE">Aktif (Dipublikasi)</option>
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Produk'}
                </button>
                <Link
                  href="/seller/dashboard"
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Batal
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewProductPage() {
  return (
    <ProtectedRoute>
      <NewProductContent />
    </ProtectedRoute>
  )
}
