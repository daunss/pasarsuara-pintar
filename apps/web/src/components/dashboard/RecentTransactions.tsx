'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'

interface Transaction {
  id: string
  type: 'SALE' | 'PURCHASE' | 'EXPENSE'
  product_name: string
  total_amount: number
  created_at: string
}

export function RecentTransactions({ limit = 10 }: { limit?: number }) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchTransactions()
    }
  }, [user])

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SALE':
        return 'text-green-600 bg-green-50'
      case 'PURCHASE':
        return 'text-blue-600 bg-blue-50'
      case 'EXPENSE':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SALE':
        return '💰'
      case 'PURCHASE':
        return '🛒'
      case 'EXPENSE':
        return '💸'
      default:
        return '📝'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Transaksi Terbaru</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Transaksi Terbaru</h3>
        <Link
          href="/transactions"
          className="text-sm text-green-600 hover:text-green-700 font-medium"
        >
          Lihat Semua →
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📝</div>
          <p>Belum ada transaksi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition"
            >
              <div className="text-2xl">{getTypeIcon(tx.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 truncate">
                    {tx.product_name}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(tx.type)}`}>
                    {tx.type}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {formatDate(tx.created_at)}
                </div>
              </div>
              <div className="text-right">
                <div className={`font-semibold ${
                  tx.type === 'SALE' ? 'text-green-600' : 'text-gray-900'
                }`}>
                  {tx.type === 'SALE' ? '+' : '-'}{formatCurrency(tx.total_amount)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
