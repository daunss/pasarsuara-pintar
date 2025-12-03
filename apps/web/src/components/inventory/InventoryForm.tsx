'use client'

import { useState, useEffect } from 'react'

interface InventoryItem {
  id: string
  product_name: string
  sku?: string
  current_stock: number
  min_stock_level: number
  max_stock_level?: number
  unit_price: number
  category?: string
  supplier?: string
  last_restocked?: string
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
    sku: '',
    current_stock: 0,
    min_stock_level: 10,
    max_stock_level: 100,
    unit_price: 0,
    category: '',
    supplier: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (item && mode === 'edit') {
      setFormData({
        product_name: item.product_name,
        sku: item.sku || '',
        current_stock: item.current_stock,
        min_stock_level: item.min_stock_level,
        max_stock_level: item.max_stock_level || 100,
        unit_price: item.unit_price,
        category: item.category || '',
        supplier: item.supplier || ''
      })
    }
  }, [item, mode])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: ['current_stock', 'min_stock_level', 'max_stock_level', 'unit_price'].includes(name)
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

    if (formData.current_stock < 0) {
      newErrors.current_stock = 'Stok tidak boleh negatif'
    }

    if (formData.min_stock_level < 0) {
      newErrors.min_stock_level = 'Min stock tidak boleh negatif'
    }

    if (formData.unit_price <= 0) {
      newErrors.unit_price = 'Harga harus lebih dari 0'
    }

    if (formData.max_stock_level && formData.max_stock_level < formData.min_stock_level) {
      newErrors.max_stock_level = 'Max stock harus lebih besar dari min stock'
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

              {/* SKU */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SKU (Opsional)
                </label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Contoh: BRS-001"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Contoh: Makanan"
                />
              </div>

              {/* Current Stock */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stok Saat Ini *
                </label>
                <input
                  type="number"
                  name="current_stock"
                  value={formData.current_stock}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.current_stock ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0"
                />
                {errors.current_stock && (
                  <p className="text-red-600 text-sm mt-1">{errors.current_stock}</p>
                )}
              </div>

              {/* Min Stock Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Stock Level *
                </label>
                <input
                  type="number"
                  name="min_stock_level"
                  value={formData.min_stock_level}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.min_stock_level ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="10"
                />
                {errors.min_stock_level && (
                  <p className="text-red-600 text-sm mt-1">{errors.min_stock_level}</p>
                )}
              </div>

              {/* Max Stock Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Stock Level
                </label>
                <input
                  type="number"
                  name="max_stock_level"
                  value={formData.max_stock_level}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.max_stock_level ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="100"
                />
                {errors.max_stock_level && (
                  <p className="text-red-600 text-sm mt-1">{errors.max_stock_level}</p>
                )}
              </div>

              {/* Unit Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Harga per Unit (Rp) *
                </label>
                <input
                  type="number"
                  name="unit_price"
                  value={formData.unit_price}
                  onChange={handleChange}
                  min="0"
                  step="100"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.unit_price ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="10000"
                />
                {errors.unit_price && (
                  <p className="text-red-600 text-sm mt-1">{errors.unit_price}</p>
                )}
              </div>

              {/* Supplier */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier (Opsional)
                </label>
                <input
                  type="text"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Contoh: PT Supplier Jaya"
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
