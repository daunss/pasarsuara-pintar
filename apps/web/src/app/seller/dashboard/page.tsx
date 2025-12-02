'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Link from 'next/link'

type SellerProfile = {
  id: string
  business_name: string
  avg_rating: number
  total_sales: number
  total_reviews: number
  is_active: boolean
}

type ProductListing = {
  id: string
  title: string
  price: number
  stock_qty: number
  listing_status: string
  orders_count: number
  views_count: number
}

function SellerDashboardContent() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<SellerProfile | null>(null)
  const [listings, setListings] = useState<ProductListing[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (user) {
      checkSellerProfile()
    }
  }, [user])

  const checkSellerProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('seller_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found
          setShowOnboarding(true)
        } else {
          throw error
        }
      } else {
        setProfile(data)
        fetchListings(data.id)
      }
    } catch (error) {
      console.error('Error checking profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchListings = async (sellerId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_listings')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setListings(data || [])
    } catch (error) {
      console.error('Error fetching listings:', error)
    }
  }

  const handleCreateProfile = async (businessName: string) => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('seller_profiles')
        .insert([{
          user_id: user.id,
          business_name: businessName,
          is_active: true
        }])
        .select()
        .single()

      if (error) throw error

      setProfile(data)
      setShowOnboarding(false)
      alert('Profil seller berhasil dibuat!')
    } catch (error) {
      console.error('Error creating profile:', error)
      alert('Gagal membuat profil seller')
    }
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
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  // Onboarding for new sellers
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🏪</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Mulai Jual di Marketplace</h2>
            <p className="text-gray-600">Daftarkan bisnis Anda dan mulai menjual produk</p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            handleCreateProfile(formData.get('business_name') as string)
          }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nama Bisnis *</label>
              <input
                type="text"
                name="business_name"
                required
                className="w-full px-4 py-3 border rounded-lg"
                placeholder="Toko Saya"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
            >
              Daftar Sebagai Seller
            </button>
          </form>

          <Link href="/dashboard" className="block text-center mt-4 text-sm text-gray-600 hover:underline">
            ← Kembali ke Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  // Calculate stats
  const activeListings = listings.filter(l => l.listing_status === 'ACTIVE').length
  const totalViews = listings.reduce((sum, l) => sum + (l.views_count || 0), 0)
  const totalOrders = listings.reduce((sum, l) => sum + (l.orders_count || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/marketplace" className="text-2xl font-bold text-green-700">
                🗣️ PasarSuara
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">Seller Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/marketplace" className="text-sm text-gray-600 hover:text-green-600">
                Marketplace
              </Link>
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-green-600">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Seller Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl">
                🏪
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{profile.business_name}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  {profile.avg_rating > 0 && (
                    <span>⭐ {profile.avg_rating.toFixed(1)} ({profile.total_reviews} ulasan)</span>
                  )}
                  <span>{profile.total_sales} penjualan</span>
                </div>
              </div>
            </div>
            <Link
              href="/seller/products/new"
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700"
            >
              + Tambah Produk
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Produk Aktif</div>
            <div className="text-3xl font-bold text-green-600">{activeListings}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Views</div>
            <div className="text-3xl font-bold text-blue-600">{totalViews}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Orders</div>
            <div className="text-3xl font-bold text-purple-600">{totalOrders}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Rating</div>
            <div className="text-3xl font-bold text-yellow-600">
              {profile.avg_rating > 0 ? profile.avg_rating.toFixed(1) : '-'}
            </div>
          </div>
        </div>

        {/* Products List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Produk Saya</h2>
          </div>
          <div className="p-6">
            {listings.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Belum ada produk</h3>
                <p className="text-gray-600 mb-6">Mulai jual produk Anda sekarang!</p>
                <Link
                  href="/seller/products/new"
                  className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700"
                >
                  + Tambah Produk Pertama
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {listings.map((listing) => (
                  <div key={listing.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50">
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-3xl">
                      📦
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{listing.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>{formatCurrency(listing.price)}</span>
                        <span>Stok: {listing.stock_qty}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          listing.listing_status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                          listing.listing_status === 'SOLD_OUT' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {listing.listing_status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <div>{listing.views_count} views</div>
                      <div>{listing.orders_count} orders</div>
                    </div>
                    <Link
                      href={`/seller/products/${listing.id}/edit`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Edit
                    </Link>
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

export default function SellerDashboardPage() {
  return (
    <ProtectedRoute>
      <SellerDashboardContent />
    </ProtectedRoute>
  )
}
