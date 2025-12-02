'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase, type ProductCatalog } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Link from 'next/link'

function CatalogPageContent() {
  const { user } = useAuth()
  const [products, setProducts] = useState<ProductCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    product_name: '',
    category: '',
    description: '',
    default_price: '',
    default_unit: '',
    sku: ''
  })

  const userId = user?.id || '11111111-1111-1111-1111-111111111111'

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('product_catalog')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('product_name', { ascending: true })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { error } = await supabase
        .from('product_catalog')
        .insert([{
          user_id: userId,
          product_name: formData.product_name,
          category: formData.category || null,
          description: formData.description || null,
          default_price: formData.default_price ? parseFloat(formData.default_price) : null,
          default_unit: formData.default_unit || null,
          sku: formData.sku || null,
          is_active: true
        }])

      if (error) throw error

      // Reset form and refresh
      setFormData({
        product_name: '',
        category: '',
        description: '',
        default_price: '',
        default_unit: '',
        sku: ''
      })
      setShowAddForm(false)
      fetchProducts()
    } catch (error) {
      console.error('Error adding product:', error)
      alert('Gagal menambahkan produk')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus produk ini?')) return

    try {
      const { error } = await supabase
        .from('product_catalog')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
      fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Gagal menghapus produk')
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Group by category
  const groupedProducts = products.reduce((acc, product) => {
    const category = product.category || 'Lainnya'
    if (!acc[category]) acc[category] = []
    acc[category].push(product)
    return acc
  }, {} as Record<string, ProductCatalog[]>)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-2xl font-bold text-green-700">
                🗣️ PasarSuara
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">Katalog Produk</span>
            </div>
            <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
              ← Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">📦 Katalog Produk</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
          >
            {showAddForm ? '✕ Batal' : '+ Tambah Produk'}
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Tambah Produk Baru</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nama Produk *</label>
                    <input
                      type="text"
                      required
                      value={formData.product_name}
                      onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Nasi Goreng"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Kategori</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Makanan"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Harga Default</label>
                    <input
                      type="number"
                      value={formData.default_price}
                      onChange={(e) => setFormData({...formData, default_price: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="15000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Satuan</label>
                    <input
                      type="text"
                      value={formData.default_unit}
                      onChange={(e) => setFormData({...formData, default_unit: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="porsi"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">SKU</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({...formData, sku: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="NG-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Deskripsi</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Nasi goreng spesial dengan telur"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                >
                  Simpan Produk
                </button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Products List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat katalog...</p>
          </div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 text-lg mb-4">📦 Katalog masih kosong</p>
              <p className="text-gray-400">Klik "Tambah Produk" untuk mulai menambahkan produk</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedProducts).map(([category, items]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-xl">{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((product) => (
                      <div key={product.id} className="border rounded-lg p-4 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg">{product.product_name}</h3>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            🗑️
                          </button>
                        </div>
                        {product.description && (
                          <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                        )}
                        <div className="space-y-1 text-sm">
                          {product.default_price && (
                            <p className="text-green-600 font-semibold">
                              {formatCurrency(product.default_price)}
                              {product.default_unit && `/${product.default_unit}`}
                            </p>
                          )}
                          {product.sku && (
                            <p className="text-gray-500">SKU: {product.sku}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}


export default function CatalogPage() {
  return (
    <ProtectedRoute>
      <CatalogPageContent />
    </ProtectedRoute>
  )
}
