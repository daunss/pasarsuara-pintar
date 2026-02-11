'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  total_transactions: number
  total_spent: number
  last_transaction_date?: string
  created_at: string
  notes?: string
  tags?: string[]
}

export default function CustomersPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'spent' | 'recent'>('recent')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchCustomers()
    }
  }, [user])

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_customer_list', { p_user_id: user?.id })

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers
    .filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'spent':
          return b.total_spent - a.total_spent
        case 'recent':
        default:
          return new Date(b.last_transaction_date || b.created_at).getTime() - 
                 new Date(a.last_transaction_date || a.created_at).getTime()
      }
    })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (authLoading || loading) {
    return (
      <div className="page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terra mx-auto mb-4"></div>
          <p className="text-muted">Loading customers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-bg">
      {/* Header */}
      <header className="page-header">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <Link href="/dashboard" className="text-terra hover:text-forest">
              ← Dashboard
            </Link>
            <span className="text-muted/70 hidden sm:inline">|</span>
            <h1 className="text-lg sm:text-xl font-bold font-display text-charcoal">👥 Manajemen Pelanggan</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-8">
          <div className="card-warm p-4 sm:p-6">
            <p className="text-sm text-muted mb-1">Total Pelanggan</p>
            <p className="text-xl sm:text-3xl font-bold font-display text-charcoal">{customers.length}</p>
          </div>
          <div className="card-warm p-4 sm:p-6">
            <p className="text-sm text-muted mb-1">Total Transaksi</p>
            <p className="text-xl sm:text-3xl font-bold font-display text-charcoal">
              {customers.reduce((sum, c) => sum + c.total_transactions, 0)}
            </p>
          </div>
          <div className="card-warm p-4 sm:p-6">
            <p className="text-sm text-muted mb-1">Total Pendapatan</p>
            <p className="text-lg sm:text-2xl font-bold font-display text-terra">
              {formatCurrency(customers.reduce((sum, c) => sum + c.total_spent, 0))}
            </p>
          </div>
          <div className="card-warm p-4 sm:p-6">
            <p className="text-sm text-muted mb-1">Rata-rata per Pelanggan</p>
            <p className="text-lg sm:text-2xl font-bold font-display text-terra">
              {formatCurrency(
                customers.length > 0
                  ? customers.reduce((sum, c) => sum + c.total_spent, 0) / customers.length
                  : 0
              )}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="card-warm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Cari nama atau nomor telepon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-warm"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="input-warm"
            >
              <option value="recent">Terbaru</option>
              <option value="name">Nama A-Z</option>
              <option value="spent">Pengeluaran Tertinggi</option>
            </select>
          </div>
        </div>

        {/* Customer List */}
        <div className="card-warm overflow-hidden">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">👥</span>
              <p className="text-muted">
                {searchQuery ? 'Tidak ada pelanggan yang cocok' : 'Belum ada pelanggan'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-cream-light border-b border-cream-dark/40">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Pelanggan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Kontak
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Transaksi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Total Belanja
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Terakhir Transaksi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-cream-dark/40">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-cream-light">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-forest/10 rounded-full flex items-center justify-center">
                            <span className="text-terra font-semibold">
                              {customer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-charcoal">{customer.name}</div>
                            {customer.tags && customer.tags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {customer.tags.map((tag, i) => (
                                  <span key={i} className="text-xs bg-terra/5 text-terra px-2 py-0.5 rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-charcoal">{customer.phone}</div>
                        {customer.email && (
                          <div className="text-sm text-muted">{customer.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-charcoal">{customer.total_transactions}x</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-terra">
                          {formatCurrency(customer.total_spent)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-charcoal">
                          {customer.last_transaction_date
                            ? formatDate(customer.last_transaction_date)
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/dashboard/customers/${customer.id}`}
                          className="text-terra hover:text-forest font-medium"
                        >
                          Detail →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
