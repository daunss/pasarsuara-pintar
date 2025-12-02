'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'

type ProductListing = {
  id: string
  title: string
  description: string
  category: string
  price: number
  unit: string
  stock_qty: number
  images: string[]
  seller_id: string
  seller?: {
    business_name: string
    avg_rating: number
    total_reviews: number
  }
}

export default function MarketplacePage() {
  const { user } = useAuth()
  const [listings, setListings] = useState<ProductListing[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [sortBy, setSortBy] = useState('newest')

  const categories = ['ALL', 'Makanan', 'Minuman', 'Bahan Baku', 'Peralatan', 'Lainnya']

  useEffect(() => {
    fetchListings()
  }, [selectedCategory, sortBy])

  const fetchListings = async () => {
    try {
      let query = supabase
        .from('product_listings')
        .select(`
          *,
          seller:seller_profiles(business_name, avg_rating, total_reviews)
        `)
        .eq('listing_status', 'ACTIVE')

      if (selectedCategory !== 'ALL') {
        query = query.eq('category', selectedCategory)
      }

      // Sorting
      if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false })
      } else if (sortBy === 'price_low') {
        query = query.order('price', { ascending: true })
      } else if (sortBy === 'price_high') {
        query = query.order('price', { ascending: false })
      } else if (sortBy === 'popular') {
        query = query.order('orders_count', { ascending: false })
      }

      const { data, error } = await query.limit(50)

      if (error) throw error
      setListings(data || [])
    } catch (error) {
      console.error('Error fetching listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredListings = listings.filter(listing =>
    listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-2xl font-bold text-green-700">
                🗣️ PasarSuara
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">Marketplace</span>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <Link href="/dashboard" className="text-sm text-gray-600 hover:text-green-600">
                    Dashboard
                  </Link>
                  <Link href="/seller/dashboard" className="text-sm text-green-600 hover:text-green-700 font-medium">
                    Jual Produk
                  </Link>
                </>
              ) : (
                <Link href="/login" className="text-sm text-green-600 hover:text-green-700 font-medium">
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">🛒 Marketplace UMKM</h1>
          <p className="text-xl mb-6">Temukan produk berkualitas dari UMKM Indonesia</p>
          
          {/* Search Bar */}
          <div className="max-w-2xl">
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 rounded-lg text-gray-800 text-lg focus:ring-2 focus:ring-white"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-6 sticky top-24">
              <h3 className="font-bold text-lg mb-4">Filter</h3>
              
              {/* Categories */}
              <div className="mb-6">
                <h4 className="font-medium text-sm text-gray-700 mb-2">Kategori</h4>
                <div className="space-y-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                        selectedCategory === cat
                          ? 'bg-green-100 text-green-700 font-medium'
                          : 'hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">Urutkan</h4>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="newest">Terbaru</option>
                  <option value="popular">Terpopuler</option>
                  <option value="price_low">Harga Terendah</option>
                  <option value="price_high">Harga Tertinggi</option>
                </select>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1">
            <div className="mb-4 flex justify-between items-center">
              <p className="text-gray-600">
                {filteredListings.length} produk ditemukan
              </p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Memuat produk...</p>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Belum ada produk</h3>
                <p className="text-gray-600 mb-6">Jadilah seller pertama!</p>
                <Link
                  href="/seller/dashboard"
                  className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700"
                >
                  Mulai Jual
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/marketplace/product/${listing.id}`}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden"
                  >
                    {/* Product Image */}
                    <div className="aspect-square bg-gray-200 relative">
                      {listing.images && listing.images.length > 0 ? (
                        <img
                          src={listing.images[0]}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl">
                          📦
                        </div>
                      )}
                      {listing.stock_qty < 10 && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                          Stok Terbatas
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                        {listing.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {listing.description}
                      </p>
                      
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-2xl font-bold text-green-600">
                          {formatCurrency(listing.price)}
                        </span>
                        <span className="text-sm text-gray-500">/{listing.unit}</span>
                      </div>

                      {/* Seller Info */}
                      {listing.seller && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 truncate">
                            {listing.seller.business_name}
                          </span>
                          {listing.seller.avg_rating > 0 && (
                            <span className="flex items-center gap-1 text-yellow-600">
                              ⭐ {listing.seller.avg_rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                        Stok: {listing.stock_qty} {listing.unit}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
