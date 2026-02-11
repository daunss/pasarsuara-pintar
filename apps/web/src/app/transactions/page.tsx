'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

interface Transaction {
  id: string
  type: 'SALE' | 'PURCHASE' | 'EXPENSE'
  product_name: string
  qty: number
  price_per_unit: number
  total_amount: number
  created_at: string
}

function TransactionsContent() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Edit modal
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    if (user) {
      fetchTransactions()
    }
  }, [user])

  useEffect(() => {
    applyFilters()
  }, [transactions, dateFrom, dateTo, typeFilter, searchQuery])

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...transactions]

    // Date filter
    if (dateFrom) {
      filtered = filtered.filter(tx => tx.created_at >= dateFrom)
    }
    if (dateTo) {
      filtered = filtered.filter(tx => tx.created_at <= dateTo + 'T23:59:59')
    }

    // Type filter
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(tx => tx.type === typeFilter)
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(tx => 
        (tx.product_name || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredTransactions(filtered)
  }

  const handleExport = () => {
    const exportData = filteredTransactions.map(tx => ({
      'Tanggal': new Date(tx.created_at).toLocaleDateString('id-ID'),
      'Tipe': tx.type,
      'Produk': tx.product_name,
      'Jumlah': tx.qty,
      'Harga Satuan': tx.price_per_unit,
      'Total': tx.total_amount
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transaksi')
    XLSX.writeFile(wb, `transaksi_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editingTransaction) return

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          product_name: editingTransaction.product_name,
          qty: editingTransaction.qty,
          price_per_unit: editingTransaction.price_per_unit,
          total_amount: editingTransaction.qty * editingTransaction.price_per_unit
        })
        .eq('id', editingTransaction.id)

      if (error) throw error

      await fetchTransactions()
      setShowEditModal(false)
      setEditingTransaction(null)
    } catch (error) {
      console.error('Error updating transaction:', error)
      alert('Gagal mengupdate transaksi')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus transaksi ini?')) return

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchTransactions()
    } catch (error) {
      console.error('Error deleting transaction:', error)
      alert('Gagal menghapus transaksi')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SALE': return 'bg-forest/10 text-forest-dark'
      case 'PURCHASE': return 'bg-terra/10 text-terra-dark'
      case 'EXPENSE': return 'bg-red-100 text-red-800'
      default: return 'bg-cream text-charcoal'
    }
  }

  // Calculate totals
  const totalSales = filteredTransactions
    .filter(tx => tx.type === 'SALE')
    .reduce((sum, tx) => sum + tx.total_amount, 0)
  
  const totalPurchases = filteredTransactions
    .filter(tx => tx.type === 'PURCHASE')
    .reduce((sum, tx) => sum + tx.total_amount, 0)
  
  const totalExpenses = filteredTransactions
    .filter(tx => tx.type === 'EXPENSE')
    .reduce((sum, tx) => sum + tx.total_amount, 0)

  return (
    <div className="page-bg">
      {/* Header */}
      <header className="page-header">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl sm:text-2xl font-bold font-display text-charcoal">📊 Riwayat Transaksi</h1>
          <p className="text-sm sm:text-base text-muted">Kelola dan analisis transaksi bisnis Anda</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-6">
          <div className="card-warm p-4 sm:p-6">
            <div className="text-sm text-muted mb-1">Total Penjualan</div>
            <div className="text-xl sm:text-2xl font-bold text-forest">{formatCurrency(totalSales)}</div>
          </div>
          <div className="card-warm p-4 sm:p-6">
            <div className="text-sm text-muted mb-1">Total Pembelian</div>
            <div className="text-xl sm:text-2xl font-bold text-terra">{formatCurrency(totalPurchases)}</div>
          </div>
          <div className="card-warm p-4 sm:p-6">
            <div className="text-sm text-muted mb-1">Total Pengeluaran</div>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="card-warm p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">Dari Tanggal</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full input-warm focus:ring-2 focus:ring-terra/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">Sampai Tanggal</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full input-warm focus:ring-2 focus:ring-terra/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">Tipe</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full input-warm focus:ring-2 focus:ring-terra/30"
              >
                <option value="ALL">Semua</option>
                <option value="SALE">Penjualan</option>
                <option value="PURCHASE">Pembelian</option>
                <option value="EXPENSE">Pengeluaran</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">Cari Produk</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nama produk..."
                className="w-full input-warm focus:ring-2 focus:ring-terra/30"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => {
                setDateFrom('')
                setDateTo('')
                setTypeFilter('ALL')
                setSearchQuery('')
              }}
              className="px-4 py-2 bg-cream text-charcoal rounded-2xl hover:bg-cream-dark"
            >
              Reset Filter
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-forest text-white rounded-2xl hover:bg-forest-dark"
            >
              📥 Export Excel
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="card-warm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forest mx-auto mb-4"></div>
              <p className="text-muted">Memuat transaksi...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-muted">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-lg">Tidak ada transaksi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-cream-light">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Tanggal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Tipe</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Produk</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Jumlah</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Harga</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-dark">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-cream-light">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                        {new Date(tx.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(tx.type)}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-charcoal">{tx.product_name}</td>
                      <td className="px-6 py-4 text-charcoal">{tx.qty}</td>
                      <td className="px-6 py-4 text-charcoal">{formatCurrency(tx.price_per_unit)}</td>
                      <td className="px-6 py-4 font-semibold text-charcoal">{formatCurrency(tx.total_amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleEdit(tx)}
                          className="text-terra hover:text-terra-dark mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card-warm p-6 max-w-md w-full">
            <h3 className="text-xl font-bold font-display mb-4">Edit Transaksi</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">Produk</label>
                <input
                  type="text"
                  value={editingTransaction.product_name}
                  onChange={(e) => setEditingTransaction({...editingTransaction, product_name: e.target.value})}
                  className="w-full input-warm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">Jumlah</label>
                <input
                  type="number"
                  value={editingTransaction.qty}
                  onChange={(e) => setEditingTransaction({...editingTransaction, qty: parseFloat(e.target.value)})}
                  className="w-full input-warm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">Harga Satuan</label>
                <input
                  type="number"
                  value={editingTransaction.price_per_unit}
                  onChange={(e) => setEditingTransaction({...editingTransaction, price_per_unit: parseFloat(e.target.value)})}
                  className="w-full input-warm"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSaveEdit}
                className="flex-1 bg-forest text-white py-2 rounded-2xl hover:bg-forest-dark"
              >
                Simpan
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingTransaction(null)
                }}
                className="flex-1 bg-cream-dark text-charcoal py-2 rounded-2xl hover:bg-cream-dark"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <ProtectedRoute>
      <TransactionsContent />
    </ProtectedRoute>
  )
}
