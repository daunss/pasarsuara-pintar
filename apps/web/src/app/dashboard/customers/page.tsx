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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading customers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-green-600 hover:text-green-700">
                ← Dashboard
              </Link>
              <span className="text-gray-400">|</span>
              <h1 className="text-xl font-bold text-gray-900">👥 Manajemen Pelanggan</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600 mb-1">Total Pelanggan</p>
            <p className="text-3xl font-bold text-gray-900">{customers.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600 mb-1">Total Transaksi</p>
            <p className="text-3xl font-bold text-gray-900">
              {customers.reduce((sum, c) => sum + c.total_transactions, 0)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600 mb-1">Total Pendapatan</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(customers.reduce((sum, c) => sum + c.total_spent, 0))}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600 mb-1">Rata-rata per Pelanggan</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(
                customers.length > 0
                  ? customers.reduce((sum, c) => sum + c.total_spent, 0) / customers.length
                  : 0
              )}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Cari nama atau nomor telepon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="recent">Terbaru</option>
              <option value="name">Nama A-Z</option>
              <option value="spent">Pengeluaran Tertinggi</option>
            </select>
          </div>
        </div>

        {/* Customer List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">👥</span>
              <p className="text-gray-600">
                {searchQuery ? 'Tidak ada pelanggan yang cocok' : 'Belum ada pelanggan'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pelanggan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kontak
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaksi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Belanja
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Terakhir Transaksi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-semibold">
                              {customer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                            {customer.tags && customer.tags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {customer.tags.map((tag, i) => (
                                  <span key={i} className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{customer.phone}</div>
                        {customer.email && (
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{customer.total_transactions}x</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(customer.total_spent)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {customer.last_transaction_date
                            ? formatDate(customer.last_transaction_date)
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/dashboard/customers/${customer.id}`}
                          className="text-green-600 hover:text-green-700 font-medium"
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
