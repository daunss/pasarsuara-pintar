'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'

interface ShopeeShopInfo {
  shop_id: number
  shop_name: string
  shop_location: string
  item_count: number
  follow_count: number
  rating_star: number
  portrait: string
}

interface ShopeeProduct {
  item_id: number
  name: string
  image: string
  price: number
  price_min: number
  price_max: number
  stock: number
  sold: number
  rating_star: number
}

interface ShopeeImportProps {
  onComplete: () => void
  onClose: () => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export function ShopeeImport({ onComplete, onClose }: ShopeeImportProps) {
  const { user } = useAuth()
  const [shopName, setShopName] = useState('')
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [shopInfo, setShopInfo] = useState<ShopeeShopInfo | null>(null)
  const [preview, setPreview] = useState<ShopeeProduct[]>([])
  const [importResult, setImportResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'search' | 'preview' | 'result'>('search')

  const handleSearch = async () => {
    if (!shopName.trim()) return
    setSearching(true)
    setError('')
    setShopInfo(null)
    setPreview([])

    try {
      const resp = await fetch(`${API_URL}/api/shopee/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_name: shopName.trim() }),
      })

      const data = await resp.json()

      if (!data.success) {
        setError(data.error || 'Toko tidak ditemukan')
        return
      }

      setShopInfo(data.shop)
      setPreview(data.preview || [])
      setStep('preview')
    } catch {
      setError('Gagal menghubungi server. Pastikan backend aktif.')
    } finally {
      setSearching(false)
    }
  }

  const handleImport = async () => {
    if (!shopInfo || !user) return
    setImporting(true)
    setError('')

    try {
      const resp = await fetch(`${API_URL}/api/shopee/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: shopInfo.shop_id,
          user_id: user.id,
          limit: 0, // import all
        }),
      })

      const data = await resp.json()

      if (!data.success) {
        setError(data.error || 'Gagal import produk')
        return
      }

      setImportResult(data)
      setStep('result')
    } catch {
      setError('Gagal menghubungi server.')
    } finally {
      setImporting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🛒</span>
            <div>
              <h2 className="text-xl font-bold">Import dari Shopee</h2>
              <p className="text-orange-100 text-sm">Masukkan nama toko Shopee untuk import produk</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:text-orange-200 text-2xl">&times;</button>
        </div>

        <div className="p-6">
          {/* Step 1: Search Shop */}
          {step === 'search' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Toko Shopee
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Contoh: tokobuahsegar atau https://shopee.co.id/tokobuahsegar"
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || !shopName.trim()}
                  className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                  {searching ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Mencari...
                    </>
                  ) : (
                    <>🔍 Cari</>
                  )}
                </button>
              </div>
              <p className="text-gray-400 text-xs mt-2">
                Bisa pakai nama toko, username, atau URL lengkap Shopee
              </p>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && shopInfo && (
            <div>
              {/* Shop Info Card */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-orange-200 rounded-full flex items-center justify-center text-2xl">
                    🏪
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{shopInfo.shop_name}</h3>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600 mt-1">
                      <span>📍 {shopInfo.shop_location || 'Indonesia'}</span>
                      <span>📦 {shopInfo.item_count} produk</span>
                      <span>👥 {shopInfo.follow_count?.toLocaleString()} pengikut</span>
                      {shopInfo.rating_star > 0 && (
                        <span>⭐ {shopInfo.rating_star.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Preview */}
              {preview.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 mb-3">
                    Preview Produk ({preview.length} dari {shopInfo.item_count})
                  </h4>
                  <div className="space-y-3">
                    {preview.map((p) => (
                      <div key={p.item_id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-12 h-12 object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-product.png'
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                          <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                            <span className="text-orange-600 font-semibold">
                              {formatCurrency(p.price || p.price_min)}
                            </span>
                            <span>Stok: {p.stock}</span>
                            <span>Terjual: {p.sold}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {shopInfo.item_count > preview.length && (
                    <p className="text-sm text-gray-400 mt-2 text-center">
                      ...dan {shopInfo.item_count - preview.length} produk lainnya
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('search')
                    setShopInfo(null)
                    setPreview([])
                  }}
                  className="flex-1 border-2 border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  ← Cari Lagi
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex-1 bg-orange-500 text-white px-4 py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
                >
                  {importing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Mengimport {shopInfo.item_count} produk...
                    </>
                  ) : (
                    <>📥 Import Semua ({shopInfo.item_count} produk)</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Result */}
          {step === 'result' && importResult && (
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Import Berhasil!</h3>
              <p className="text-gray-600 mb-6">{importResult.message}</p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
                  <p className="text-sm text-green-700">Berhasil Import</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-yellow-600">{importResult.skipped || 0}</p>
                  <p className="text-sm text-yellow-700">Duplikat/Skip</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-blue-600">{importResult.total}</p>
                  <p className="text-sm text-blue-700">Total Produk</p>
                </div>
              </div>

              {importResult.errors?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm font-semibold text-red-700 mb-2">
                    {importResult.errors.length} error:
                  </p>
                  <ul className="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
                    {importResult.errors.slice(0, 10).map((err: string, i: number) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => {
                  onComplete()
                  onClose()
                }}
                className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Lihat Inventory →
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">❌ {error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
