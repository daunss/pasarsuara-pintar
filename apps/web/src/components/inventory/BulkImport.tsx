'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

interface BulkImportProps {
  onComplete: () => void
  onClose: () => void
}

interface ImportResult {
  success: number
  failed: number
  errors: string[]
}

export function BulkImport({ onComplete, onClose }: BulkImportProps) {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim())
    const data = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const row: any = {}
      
      headers.forEach((header, index) => {
        row[header] = values[index]
      })
      
      data.push(row)
    }

    return data
  }

  const validateRow = (row: any): { valid: boolean; error?: string } => {
    if (!row.product_name || !row.product_name.trim()) {
      return { valid: false, error: 'product_name is required' }
    }

    const stockQty = parseFloat(row.stock_qty)
    if (isNaN(stockQty) || stockQty < 0) {
      return { valid: false, error: 'Invalid stock_qty value' }
    }

    return { valid: true }
  }

  const handleImport = async () => {
    if (!file) {
      alert('Pilih file CSV terlebih dahulu')
      return
    }

    setImporting(true)
    const errors: string[] = []
    let successCount = 0
    let failedCount = 0

    try {
      const text = await file.text()
      const rows = parseCSV(text)

      if (rows.length === 0) {
        alert('File CSV kosong atau format tidak valid')
        setImporting(false)
        return
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const validation = validateRow(row)

        if (!validation.valid) {
          errors.push(`Row ${i + 2}: ${validation.error}`)
          failedCount++
          continue
        }

        try {
          const { error } = await supabase
            .from('inventory')
            .insert({
              user_id: user?.id,
              product_name: row.product_name,
              stock_qty: parseFloat(row.stock_qty) || 0,
              unit: row.unit || 'pcs',
              min_sell_price: row.min_sell_price ? parseFloat(row.min_sell_price) : null,
              max_buy_price: row.max_buy_price ? parseFloat(row.max_buy_price) : null,
              description: row.description || null
            })

          if (error) throw error
          successCount++
        } catch (error: any) {
          errors.push(`Row ${i + 2}: ${error.message}`)
          failedCount++
        }
      }

      setResult({
        success: successCount,
        failed: failedCount,
        errors
      })

      if (successCount > 0) {
        onComplete()
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Gagal membaca file CSV')
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = `product_name,stock_qty,unit,min_sell_price,max_buy_price,description
Beras Premium 5kg,100,kg,50000,40000,Beras kualitas premium
Minyak Goreng 2L,50,pcs,30000,25000,Minyak goreng kemasan 2 liter`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'inventory_template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">📥 Bulk Import Inventory</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📋 Instruksi:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Download template CSV di bawah ini</li>
                <li>Isi data produk sesuai format template</li>
                <li>Upload file CSV yang sudah diisi</li>
                <li>Klik "Import" untuk memproses data</li>
              </ol>
            </div>

            {/* Download Template */}
            <div>
              <button
                onClick={downloadTemplate}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                📥 Download Template CSV
              </button>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload File CSV
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {file && (
                <p className="text-sm text-gray-600 mt-2">
                  File terpilih: {file.name}
                </p>
              )}
            </div>

            {/* Import Result */}
            {result && (
              <div className={`border rounded-lg p-4 ${
                result.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
              }`}>
                <h3 className="font-semibold mb-2">Hasil Import:</h3>
                <div className="space-y-1 text-sm">
                  <p className="text-green-700">✅ Berhasil: {result.success} produk</p>
                  {result.failed > 0 && (
                    <>
                      <p className="text-red-700">❌ Gagal: {result.failed} produk</p>
                      {result.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium text-red-800">Error Details:</p>
                          <ul className="list-disc list-inside text-red-700 max-h-32 overflow-y-auto">
                            {result.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                {result ? 'Tutup' : 'Batal'}
              </button>
              <button
                onClick={handleImport}
                disabled={!file || importing}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
