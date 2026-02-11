'use client'

import { useState, useEffect } from 'react'

interface InventoryItem {
  id: string
  product_name: string
  stock_qty: number
  unit: string
  min_sell_price: number
  max_buy_price?: number
  description?: string
}

interface InventoryFormProps {
  item?: InventoryItem | null
  mode: 'create' | 'edit'
  onSave: (data: Partial<InventoryItem>) => void
  onClose: () => void
}

export function InventoryForm({ item, mode, onSave, onClose }: InventoryFormProps) {
  const [formData, setFormData] = useState({
    product_name: '',
    stock_qty: 0,
    unit: 'pcs',
    min_sell_price: 0,
    max_buy_price: 0,
    description: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (item && mode === 'edit') {
      setFormData({
        product_name: item.product_name,
        stock_qty: item.stock_qty,
        unit: item.unit || 'pcs',
        min_sell_price: item.min_sell_price,
        max_buy_price: item.max_buy_price || 0,
        description: item.description || ''
      })
    }
  }, [item, mode])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: ['stock_qty', 'min_sell_price', 'max_buy_price'].includes(name)
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

    if (formData.stock_qty < 0) {
      newErrors.stock_qty = 'Stok tidak boleh negatif'
    }

    if (formData.min_sell_price < 0) {
      newErrors.min_sell_price = 'Harga jual tidak boleh negatif'
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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">
              {mode === 'edit' ? 'Edit Produk' : 'Tambah Produk Baru'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Product Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Produk *
                </label>
                <input
                  type="text"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.product_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Contoh: Beras Premium 5kg"
                />
                {errors.product_name && (
                  <p className="text-red-600 text-sm mt-1">{errors.product_name}</p>
                )}
              </div>

              {/* Stock Qty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stok *
                </label>
                <input
                  type="number"
                  name="stock_qty"
                  value={formData.stock_qty}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.stock_qty ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0"
                />
                {errors.stock_qty && (
                  <p className="text-red-600 text-sm mt-1">{errors.stock_qty}</p>
                )}
              </div>

              {/* Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Satuan
                </label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="pcs">Pcs</option>
                  <option value="kg">Kg</option>
                  <option value="gram">Gram</option>
                  <option value="liter">Liter</option>
                  <option value="lusin">Lusin</option>
                  <option value="box">Box</option>
                  <option value="pack">Pack</option>
                </select>
              </div>

              {/* Min Sell Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Harga Jual Min (Rp)
                </label>
                <input
                  type="number"
                  name="min_sell_price"
                  value={formData.min_sell_price}
                  onChange={handleChange}
                  min="0"
                  step="100"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.min_sell_price ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="10000"
                />
                {errors.min_sell_price && (
                  <p className="text-red-600 text-sm mt-1">{errors.min_sell_price}</p>
                )}
              </div>

              {/* Max Buy Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Harga Beli Max (Rp)
                </label>
                <input
                  type="number"
                  name="max_buy_price"
                  value={formData.max_buy_price}
                  onChange={handleChange}
                  min="0"
                  step="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="8000"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deskripsi (Opsional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Deskripsi produk..."
                />
              </div>
            </div>

            {/* Action Buttons */}
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
