'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase, type Payment, type Transaction } from '@/lib/supabase'
import Link from 'next/link'

type PaymentWithTransaction = Payment & {
  transaction?: Transaction
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentWithTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  const demoUserId = '11111111-1111-1111-1111-111111111111'

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      // First get all transactions for this user
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', demoUserId)

      if (txError) throw txError

      const transactionIds = transactions?.map(t => t.id) || []

      if (transactionIds.length === 0) {
        setPayments([])
        setLoading(false)
        return
      }

      // Then get payments for those transactions
      const { data: paymentsData, error: payError } = await supabase
        .from('payments')
        .select(`
          *,
          transaction:transactions(*)
        `)
        .in('transaction_id', transactionIds)
        .order('created_at', { ascending: false })

      if (payError) throw payError
      setPayments(paymentsData || [])
    } catch (error) {
      console.error('Error fetching payments:', error)
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      PAID: 'bg-forest/10 text-forest',
      PENDING: 'bg-amber-100 text-amber-800',
      PARTIAL: 'bg-terra/5 text-terra',
      FAILED: 'bg-red-100 text-red-800',
      REFUNDED: 'bg-cream text-charcoal'
    }
    return badges[status as keyof typeof badges] || 'bg-cream text-charcoal'
  }

  const getPaymentMethodIcon = (method: string | null) => {
    const icons = {
      CASH: '💵',
      TRANSFER: '🏦',
      CREDIT: '💳',
      DEBIT: '💳',
      EWALLET: '📱'
    }
    return icons[method as keyof typeof icons] || '💰'
  }

  const filteredPayments = filterStatus === 'ALL' 
    ? payments 
    : payments.filter(p => p.status === filterStatus)

  // Calculate totals
  const totalPaid = payments
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0)
  
  const totalPending = payments
    .filter(p => p.status === 'PENDING')
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="page-bg">
      {/* Header */}
      <header className="page-header">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-xl sm:text-2xl font-bold font-display text-forest">
                🗣️ Suara Niaga
              </Link>
              <span className="text-muted/70 hidden sm:inline">|</span>
              <span className="text-muted hidden sm:inline">Riwayat Pembayaran</span>
            </div>
            <Link href="/dashboard" className="text-sm text-terra hover:text-terra-dark transition">
              ← Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        <h1 className="text-xl sm:text-3xl font-bold font-display text-charcoal mb-6">💳 Riwayat Pembayaran</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted mb-1">Total Terbayar</div>
              <div className="text-xl sm:text-2xl font-bold font-display text-terra">{formatCurrency(totalPaid)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted mb-1">Total Pending</div>
              <div className="text-xl sm:text-2xl font-bold font-display text-yellow-600">{formatCurrency(totalPending)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted mb-1">Total Transaksi</div>
              <div className="text-xl sm:text-2xl font-bold font-display text-terra">{payments.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['ALL', 'PAID', 'PENDING', 'PARTIAL', 'FAILED', 'REFUNDED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-2xl font-medium whitespace-nowrap transition ${
                filterStatus === status
                  ? 'bg-forest text-white'
                  : 'bg-white text-muted hover:bg-cream'
              }`}
            >
              {status === 'ALL' ? 'Semua' : status}
            </button>
          ))}
        </div>

        {/* Payments List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terra mx-auto"></div>
            <p className="mt-4 text-muted">Memuat pembayaran...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted text-lg mb-4">💳 Belum ada riwayat pembayaran</p>
              <p className="text-muted/70">Pembayaran akan muncul di sini setelah transaksi dicatat</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-cream-light border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Tanggal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Produk</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Jumlah</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Metode</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-cream-light">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {formatDate(payment.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="font-medium">{payment.transaction?.product_name || '-'}</div>
                          <div className="text-muted text-xs">{payment.transaction?.type}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="flex items-center gap-1">
                            {getPaymentMethodIcon(payment.payment_method)}
                            {payment.payment_method || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(payment.status)}`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                          {payment.reference_number || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
