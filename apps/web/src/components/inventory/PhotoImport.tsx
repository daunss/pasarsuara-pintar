'use client'

import { useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

interface PhotoImportProps {
  onComplete: () => void
  onClose: () => void
}

interface ReceiptItem {
  product: string
  qty: number
  unit: string
  price: number
  total: number
  type: string // SALE, PURCHASE, EXPENSE
}

type ImportStep = 'upload' | 'analyzing' | 'review' | 'saving' | 'done'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export function PhotoImport({ onComplete, onClose }: PhotoImportProps) {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<ImportStep>('upload')
  const [preview, setPreview] = useState<string | null>(null)
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [summary, setSummary] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saveResult, setSaveResult] = useState<{ success: number; failed: number } | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar (JPG, PNG, dll)')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran file maksimal 10MB')
      return
    }

    setError(null)

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    // Upload and analyze
    setStep('analyzing')

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch(`${API_URL}/api/receipt/analyze`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'Gagal menganalisis foto')
        setStep('upload')
        return
      }

      setItems(data.items.map((item: ReceiptItem) => ({
        ...item,
        total: item.total || item.qty * item.price,
        qty: item.qty || 1,
      })))
      setSummary(data.summary)
      setStep('review')
    } catch (err) {
      console.error('Upload error:', err)
      setError('Gagal mengirim foto ke server. Pastikan koneksi internet stabil.')
      setStep('upload')
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [handleFile])

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof ReceiptItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, [field]: value }
      if (field === 'qty' || field === 'price') {
        updated.total = (updated.qty || 1) * (updated.price || 0)
      }
      return updated
    }))
  }

  const handleSave = async () => {
    if (!user || items.length === 0) return

    setStep('saving')
    let successCount = 0
    let failedCount = 0

    for (const item of items) {
      try {
        // Create transaction
        const txType = item.type === 'SALE' ? 'SALE' : item.type === 'PURCHASE' ? 'PURCHASE' : 'EXPENSE'
        const { error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            type: txType,
            product_name: item.product,
            quantity: item.qty,
            unit_price: item.price,
            total_amount: item.total,
            source: 'WEB_PHOTO',
            notes: `Import dari foto: ${summary}`,
          })

        if (txError) throw txError

        // Update or create inventory
        const { data: existingInv } = await supabase
          .from('inventory')
          .select('id, stock_qty')
          .eq('user_id', user.id)
          .ilike('product_name', item.product)
          .limit(1)
          .single()

        if (existingInv) {
          let newQty = existingInv.stock_qty
          if (txType === 'SALE') {
            newQty = Math.max(0, newQty - item.qty)
          } else if (txType === 'PURCHASE') {
            newQty += item.qty
          }
          await supabase
            .from('inventory')
            .update({ stock_qty: newQty })
            .eq('id', existingInv.id)
        } else {
          await supabase
            .from('inventory')
            .insert({
              user_id: user.id,
              product_name: item.product,
              stock_qty: txType === 'PURCHASE' ? item.qty : 0,
              unit: item.unit || 'pcs',
              min_sell_price: txType === 'SALE' ? item.price : null,
              max_buy_price: txType === 'PURCHASE' ? item.price : null,
            })
        }

        successCount++
      } catch (err) {
        console.error('Save error:', err)
        failedCount++
      }
    }

    setSaveResult({ success: successCount, failed: failedCount })
    setStep('done')

    if (successCount > 0) {
      onComplete()
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'SALE': return { text: 'Penjualan', color: 'bg-green-100 text-green-800' }
      case 'PURCHASE': return { text: 'Pembelian', color: 'bg-blue-100 text-blue-800' }
      default: return { text: 'Pengeluaran', color: 'bg-orange-100 text-orange-800' }
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">📸 Import dari Foto Nota/Struk</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-2">📋 Cara kerja:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-purple-800">
                  <li>Upload foto nota, struk, atau catatan keuangan</li>
                  <li>AI akan menganalisis dan mengekstrak item dari foto</li>
                  <li>Review hasil, edit jika perlu, lalu simpan</li>
                </ol>
              </div>

              {/* Drop zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition ${
                  dragActive
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                }`}
              >
                <div className="text-5xl mb-4">📷</div>
                <p className="font-semibold text-gray-700 mb-1">
                  Klik atau drag &amp; drop foto di sini
                </p>
                <p className="text-sm text-gray-500">
                  JPG, PNG (max 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {preview && (
                <div className="mt-4">
                  <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg shadow" />
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                  ❌ {error}
                </div>
              )}
            </div>
          )}

          {/* Step: Analyzing */}
          {step === 'analyzing' && (
            <div className="text-center py-12">
              {preview && (
                <img src={preview} alt="Analyzing" className="max-h-32 mx-auto rounded-lg shadow mb-6 opacity-75" />
              )}
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-700 font-semibold">Menganalisis foto...</p>
              <p className="text-sm text-gray-500 mt-1">AI sedang membaca nota/struk Anda</p>
            </div>
          )}

          {/* Step: Review */}
          {step === 'review' && (
            <div className="space-y-4">
              {summary && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                  📝 {summary}
                </div>
              )}

              {preview && (
                <div className="flex justify-center">
                  <img src={preview} alt="Receipt" className="max-h-32 rounded-lg shadow" />
                </div>
              )}

              <div className="text-sm text-gray-600 font-medium">
                {items.length} item terdeteksi — edit jika perlu:
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {items.map((item, index) => {
                  const typeInfo = getTypeLabel(item.type)
                  return (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                          {typeInfo.text}
                        </span>
                        <button
                          onClick={() => removeItem(index)}
                          className="text-red-400 hover:text-red-600 text-sm"
                        >
                          ✕ Hapus
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500">Produk</label>
                          <input
                            type="text"
                            value={item.product}
                            onChange={(e) => updateItem(index, 'product', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500">Qty</label>
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateItem(index, 'qty', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500">Harga</label>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                      </div>
                      <div className="mt-1 text-right text-sm font-semibold text-gray-700">
                        Total: {formatCurrency(item.total)}
                      </div>
                    </div>
                  )
                })}
              </div>

              {items.length > 0 && (
                <div className="bg-gray-100 rounded-lg p-3 text-right">
                  <span className="text-sm text-gray-600">Grand Total: </span>
                  <span className="font-bold text-lg">
                    {formatCurrency(items.reduce((sum, i) => sum + i.total, 0))}
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('upload')
                    setItems([])
                    setPreview(null)
                    setSummary('')
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  ← Upload Ulang
                </button>
                <button
                  onClick={handleSave}
                  disabled={items.length === 0}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
                >
                  💾 Simpan {items.length} Item
                </button>
              </div>
            </div>
          )}

          {/* Step: Saving */}
          {step === 'saving' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-700 font-semibold">Menyimpan data...</p>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && saveResult && (
            <div className="space-y-4">
              <div className={`border rounded-lg p-6 text-center ${
                saveResult.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="text-5xl mb-3">
                  {saveResult.failed === 0 ? '✅' : '⚠️'}
                </div>
                <h3 className="text-lg font-bold mb-2">
                  {saveResult.failed === 0 ? 'Import Berhasil!' : 'Import Selesai'}
                </h3>
                <p className="text-green-700">
                  ✅ {saveResult.success} item berhasil disimpan
                </p>
                {saveResult.failed > 0 && (
                  <p className="text-red-700 mt-1">
                    ❌ {saveResult.failed} item gagal
                  </p>
                )}
              </div>

              <button
                onClick={onClose}
                className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 transition"
              >
                Tutup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
