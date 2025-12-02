'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type ProductListing = {
  id: string
  title: string
  description: string
  category: string
  price: number
  unit: string
  min_order_qty: number
  stock_qty: number
  images: string[]
  seller_id: string
  seller?: {
    id: string
    business_name: string
    description: string
    avg_rating: number
    total_reviews: number
    total_sales: number
  }
}

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [listing, setListing] = useState<ProductListing | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)

  useEffect(() => {
    fetchListing()
  }, [params.id])

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from('product_listings')
        .select(`
          *,
          seller:seller_profiles(id, business_name, description, avg_rating, total_reviews, total_sales)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      setListing(data)
      
      // Update view count
      await supabase
        .from('product_listings')
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq('id', params.id)
    } catch (error) {
      console.error('Error fetching listing:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOrder = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!listing) return

    // TODO: Implement cart or direct order
    alert(`Order ${quantity} ${listing.unit} ${listing.title} - Total: ${formatCurrency(listing.price * quantity)}`)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat produk...</p>
        </div>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Produk Tidak Ditemukan</h2>
          <Link href="/marketplace" className="text-green-600 hover:underline">
            ← Kembali ke Marketplace
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/marketplace" className="text-green-600 hover:text-green-700">
                ← Marketplace
              </Link>
            </div>
            {user && (
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-green-600">
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div>
            <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
              <div className="aspect-square bg-gray-200">
                {listing.images && listing.images.length > 0 ? (
                  <img
                    src={listing.images[selectedImage]}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-9xl">
                    📦
                  </div>
                )}
              </div>
            </div>
            
            {/* Thumbnail Gallery */}
            {listing.images && listing.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {listing.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square bg-gray-200 rounded-lg overflow-hidden ${
                      selectedImage === idx ? 'ring-2 ring-green-600' : ''
                    }`}
                  >
                    <img src={img} alt={`${listing.title} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div className="bg-white rounded-lg shadow p-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{listing.title}</h1>
              
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full">
                  {listing.category}
                </span>
                {listing.stock_qty < 10 && (
                  <span className="bg-red-100 text-red-700 text-sm px-3 py-1 rounded-full">
                    Stok Terbatas
                  </span>
                )}
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold text-green-600">
                    {formatCurrency(listing.price)}
                  </span>
                  <span className="text-xl text-gray-500">/{listing.unit}</span>
                </div>
                <p className="text-sm text-gray-600">
                  Min. order: {listing.min_order_qty} {listing.unit}
                </p>
              </div>

              <div className="mb-6 pb-6 border-b">
                <h3 className="font-semibold mb-2">Deskripsi</h3>
                <p className="text-gray-600 whitespace-pre-line">{listing.description}</p>
              </div>

              {/* Quantity Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Jumlah</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(listing.min_order_qty, quantity - 1))}
                    className="w-10 h-10 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(listing.min_order_qty, parseInt(e.target.value) || listing.min_order_qty))}
                    className="w-20 text-center border rounded-lg py-2"
                    min={listing.min_order_qty}
                    max={listing.stock_qty}
                  />
                  <button
                    onClick={() => setQuantity(Math.min(listing.stock_qty, quantity + 1))}
                    className="w-10 h-10 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    +
                  </button>
                  <span className="text-sm text-gray-600">
                    Stok: {listing.stock_qty} {listing.unit}
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(listing.price * quantity)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleOrder}
                  disabled={listing.stock_qty === 0}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {listing.stock_qty === 0 ? 'Stok Habis' : 'Pesan Sekarang'}
                </button>
                <button className="px-6 py-3 border-2 border-green-600 text-green-600 rounded-lg font-semibold hover:bg-green-50 transition">
                  💬 Chat
                </button>
              </div>
            </div>

            {/* Seller Info */}
            {listing.seller && (
              <div className="bg-white rounded-lg shadow p-6 mt-6">
                <h3 className="font-semibold mb-4">Informasi Penjual</h3>
                <Link
                  href={`/marketplace/seller/${listing.seller.id}`}
                  className="flex items-start gap-4 hover:bg-gray-50 p-3 rounded-lg transition"
                >
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                    🏪
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{listing.seller.business_name}</h4>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{listing.seller.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      {listing.seller.avg_rating > 0 && (
                        <span className="flex items-center gap-1">
                          ⭐ {listing.seller.avg_rating.toFixed(1)} ({listing.seller.total_reviews} ulasan)
                        </span>
                      )}
                      <span className="text-gray-600">
                        {listing.seller.total_sales} penjualan
                      </span>
                    </div>
                  </div>
                  <span className="text-green-600">→</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
