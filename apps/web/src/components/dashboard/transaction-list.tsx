'use client'

import { Transaction } from '@/lib/supabase'

interface TransactionListProps {
  transactions: Transaction[]
}

export function TransactionList({ transactions }: TransactionListProps) {
  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'Rp 0'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'SALE':
        return 'bg-green-100 text-green-800'
      case 'PURCHASE':
        return 'bg-blue-100 text-blue-800'
      case 'EXPENSE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'SALE':
        return 'Penjualan'
      case 'PURCHASE':
        return 'Pembelian'
      case 'EXPENSE':
        return 'Pengeluaran'
      default:
        return type
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Belum ada transaksi
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-4">
            <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeStyle(tx.type)}`}>
              {getTypeLabel(tx.type)}
            </span>
            <div>
              <p className="font-medium">{tx.product_name || 'Item'}</p>
              <p className="text-sm text-gray-500">
                {tx.qty} x {formatCurrency(tx.price_per_unit)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`font-semibold ${tx.type === 'SALE' ? 'text-green-600' : 'text-gray-900'}`}>
              {tx.type === 'SALE' ? '+' : '-'}{formatCurrency(tx.total_amount)}
            </p>
            <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
