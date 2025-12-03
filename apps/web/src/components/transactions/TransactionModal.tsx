'use client'

import { useState, useEffect } from 'react'

interface Transaction {
  id: string
  type: 'SALE' | 'PURCHASE' | 'EXPENSE'
  product_name: string
  qty: number
  price_per_unit: number
  total_amount: number
  created_at: string
  raw_voice_text?: string
}

interface TransactionModalProps {
  transaction?: Transaction | null
  mode: 'create' | 'edit'
  onSave: (data: Partial<Transaction>) => void
  onClose: () => void
}

export function TransactionModal({ transaction, mode, onSave, onClose }: TransactionModalProps) {
  const [formData, setFormData] = useState({
    type: 'SALE' as 'SALE' | 'PURCHASE' | 'EXPENSE',
    product_name: '',
    qty: 1,
    price_per_unit: 0,
    total_amount: 0,
    raw_voice_text: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (transaction && mode === 'edit') {
      setFormData({
        type: transaction.type,
        product_name: transaction.product_name,
        qty: transaction.qty,
        price_per_unit: transaction.price_per_unit,
        total_amount: transaction.total_amount,
        raw_voice_text: transaction.raw_voice_text || ''
      })
    }
  }, [transaction, mode])

  useEffect(() => {
    const total = formData.qty * formData.price_per_unit
    setFormData(prev => ({ ...prev, total_amount: total }))
  }, [formData.qty, formData.price_per_unit])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'qty' || name === 'price_per_unit' || name === 'total_amount' 
        ? parseFloat(value) || 0 
        : value
    }))
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.product_name.trim()) {
      newErrors.product_name = 'Nama produk wajib diisi'
    }

    if (formData.qty <= 0) {
      newErrors.qty = 'Quantity harus lebih dari 0'
    }

    if (formData.price_per_unit <= 0) {
      newErrors.price_per_unit = 'Harga per unit harus lebih dari 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return

    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">
              {mode === 'edit' ? 'Edit Transaksi' : 'Tambah Transaksi'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipe Transaksi
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="SALE">💰 Penjualan</option>
                <option value="PURCHASE">🛒 Pembelian</option>
                <option value="EXPENSE">💸 Pengeluaran</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Produk/Item
              </label>
              <input
                type="text"
                name="product_name"
                value={formData.product_name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.product_name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Contoh: Beras 5kg"
              />
              {errors.product_name && (
                <p className="text-red-600 text-sm mt-1">{errors.product_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jumlah/Quantity
              </label>
              <input
                type="number"
                name="qty"
                value={formData.qty}
                onChange={handleChange}
                min="0.01"
                step="0.01"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.qty ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="1"
              />
              {errors.qty && (
                <p className="text-red-600 text-sm mt-1">{errors.qty}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Harga per Unit (Rp)
              </label>
              <input
                type="number"
                name="price_per_unit"
                value={formData.price_per_unit}
                onChange={handleChange}
                min="0"
                step="100"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.price_per_unit ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="10000"
              />
              {errors.price_per_unit && (
                <p className="text-red-600 text-sm mt-1">{errors.price_per_unit}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Amount (Otomatis)
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                Rp {formData.total_amount.toLocaleString('id-ID')}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catatan Voice (Opsional)
              </label>
              <textarea
                name="raw_voice_text"
                value={formData.raw_voice_text}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Catatan tambahan dari voice input..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                {mode === 'edit' ? 'Update' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
