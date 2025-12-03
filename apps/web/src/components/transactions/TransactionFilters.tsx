'use client'

import { useState } from 'react'

interface Filters {
  dateFrom?: Date
  dateTo?: Date
  type?: 'SALE' | 'PURCHASE' | 'EXPENSE' | 'ALL'
  search?: string
}

interface TransactionFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
}

export function TransactionFilters({ filters, onFiltersChange }: TransactionFiltersProps) {
  const [localFilters, setLocalFilters] = useState<Filters>(filters)

  const handleFilterChange = (key: keyof Filters, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearFilters = () => {
    const emptyFilters = {}
    setLocalFilters(emptyFilters)
    onFiltersChange(emptyFilters)
  }

  const formatDateForInput = (date?: Date) => {
    if (!date) return ''
    return date.toISOString().split('T')[0]
  }

  const hasActiveFilters = Object.keys(localFilters).some(key => {
    const value = localFilters[key as keyof Filters]
    return value !== undefined && value !== '' && value !== 'ALL'
  })

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Filter Transaksi</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Hapus Semua Filter
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dari Tanggal
          </label>
          <input
            type="date"
            value={formatDateForInput(localFilters.dateFrom)}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value ? new Date(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sampai Tanggal
          </label>
          <input
            type="date"
            value={formatDateForInput(localFilters.dateTo)}
            onChange={(e) => handleFilterChange('dateTo', e.target.value ? new Date(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipe Transaksi
          </label>
          <select
            value={localFilters.type || 'ALL'}
            onChange={(e) => handleFilterChange('type', e.target.value === 'ALL' ? undefined : e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="ALL">Semua Tipe</option>
            <option value="SALE">Penjualan</option>
            <option value="PURCHASE">Pembelian</option>
            <option value="EXPENSE">Pengeluaran</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cari Produk
          </label>
          <input
            type="text"
            placeholder="Nama produk..."
            value={localFilters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              const today = new Date()
              handleFilterChange('dateFrom', today)
              handleFilterChange('dateTo', today)
            }}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition"
          >
            Hari Ini
          </button>
          <button
            onClick={() => {
              const today = new Date()
              const weekAgo = new Date(today)
              weekAgo.setDate(today.getDate() - 7)
              handleFilterChange('dateFrom', weekAgo)
              handleFilterChange('dateTo', today)
            }}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition"
          >
            7 Hari Terakhir
          </button>
          <button
            onClick={() => {
              const today = new Date()
              const monthAgo = new Date(today)
              monthAgo.setMonth(today.getMonth() - 1)
              handleFilterChange('dateFrom', monthAgo)
              handleFilterChange('dateTo', today)
            }}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition"
          >
            30 Hari Terakhir
          </button>
          <button
            onClick={() => handleFilterChange('type', 'SALE')}
            className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm hover:bg-green-200 transition"
          >
            Hanya Penjualan
          </button>
        </div>
      </div>
    </div>
  )
}
