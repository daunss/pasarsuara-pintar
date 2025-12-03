'use client'

import { Suspense, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from '@/components/dashboard/stats-card'
import { TransactionList } from '@/components/dashboard/transaction-list'
import { InventoryTable } from '@/components/dashboard/inventory-table'
import { NegotiationChat } from '@/components/dashboard/negotiation-chat'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase, type Transaction, type Inventory, type NegotiationLog } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [negotiation, setNegotiation] = useState<NegotiationLog | null>(null)
  const [loading, setLoading] = useState(true)

  // Authentication guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch data from Supabase
  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      try {
        // Fetch transactions
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (txError) throw txError
        setTransactions(txData || [])

        // Fetch inventory
        const { data: invData, error: invError } = await supabase
          .from('inventory')
          .select('*')
          .eq('user_id', user.id)
          .order('product_name')

        if (invError) throw invError
        setInventory(invData || [])

        // Fetch latest negotiation
        const { data: negData, error: negError } = await supabase
          .from('negotiation_logs')
          .select('*')
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!negError && negData) {
          setNegotiation(negData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return

    // Subscribe to transaction changes
    const transactionChannel = supabase
      .channel('transactions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Transaction change:', payload)
          
          if (payload.eventType === 'INSERT') {
            setTransactions(prev => [payload.new as Transaction, ...prev].slice(0, 10))
          } else if (payload.eventType === 'UPDATE') {
            setTransactions(prev => 
              prev.map(t => t.id === payload.new.id ? payload.new as Transaction : t)
            )
          } else if (payload.eventType === 'DELETE') {
            setTransactions(prev => prev.filter(t => t.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Subscribe to inventory changes
    const inventoryChannel = supabase
      .channel('inventory_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Inventory change:', payload)
          
          if (payload.eventType === 'INSERT') {
            setInventory(prev => [...prev, payload.new as Inventory])
          } else if (payload.eventType === 'UPDATE') {
            setInventory(prev => 
              prev.map(i => i.id === payload.new.id ? payload.new as Inventory : i)
            )
          } else if (payload.eventType === 'DELETE') {
            setInventory(prev => prev.filter(i => i.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(transactionChannel)
      supabase.removeChannel(inventoryChannel)
    }
  }, [user])

  // Calculate stats from real data
  const totalSales = transactions
    .filter(t => t.type === 'SALE')
    .reduce((sum, t) => sum + (t.total_amount || 0), 0)

  const totalPurchases = transactions
    .filter(t => t.type === 'PURCHASE')
    .reduce((sum, t) => sum + (t.total_amount || 0), 0)

  const totalExpenses = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + (t.total_amount || 0), 0)

  const grossProfit = totalSales - totalPurchases - totalExpenses

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Show empty state if no data
  const hasNoData = transactions.length === 0 && inventory.length === 0

  return hasNoData ? (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-2xl font-bold text-green-700">
                🗣️ PasarSuara
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">Dashboard</span>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Belum Ada Data</h2>
          <p className="text-gray-600 mb-6">
            Mulai catat transaksi Anda via WhatsApp untuk melihat dashboard
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-sm text-gray-700 mb-2">Kirim voice message ke WhatsApp:</p>
            <p className="font-mono text-sm bg-white p-3 rounded border">
              "Tadi laku nasi goreng 10 porsi harga 15 ribu"
            </p>
          </div>
        </div>
      </main>
    </div>
  ) : (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-2xl font-bold text-green-700">
                🗣️ PasarSuara
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard/settings" className="text-sm text-gray-600 hover:text-green-600">
                ⚙️ Pengaturan
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Link href="/marketplace" className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg shadow hover:shadow-lg transition text-center">
            <div className="text-3xl mb-2">🛒</div>
            <div className="font-semibold">Marketplace</div>
          </Link>
          <Link href="/transactions" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-center">
            <div className="text-3xl mb-2">📝</div>
            <div className="font-semibold">Transaksi</div>
          </Link>
          <Link href="/analytics" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-center">
            <div className="text-3xl mb-2">📊</div>
            <div className="font-semibold">Analytics</div>
          </Link>
          <Link href="/inventory" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-center">
            <div className="text-3xl mb-2">📦</div>
            <div className="font-semibold">Inventory</div>
          </Link>
          <Link href="/dashboard/contacts" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-center">
            <div className="text-3xl mb-2">👥</div>
            <div className="font-semibold">Kontak</div>
          </Link>
          <Link href="/dashboard/settings" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-center">
            <div className="text-3xl mb-2">⚙️</div>
            <div className="font-semibold">Pengaturan</div>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Penjualan Hari Ini"
            value={formatCurrency(totalSales)}
            icon={<span className="text-2xl">💰</span>}
            trend="up"
            trendValue="+12%"
            description="dari kemarin"
          />
          <StatsCard
            title="Pembelian"
            value={formatCurrency(totalPurchases)}
            icon={<span className="text-2xl">📦</span>}
          />
          <StatsCard
            title="Pengeluaran"
            value={formatCurrency(totalExpenses)}
            icon={<span className="text-2xl">💸</span>}
          />
          <StatsCard
            title="Laba Kotor"
            value={formatCurrency(grossProfit)}
            icon={<span className="text-2xl">📈</span>}
            trend={grossProfit >= 0 ? 'up' : 'down'}
          />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>📋</span> Transaksi Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading...</div>}>
                <TransactionList transactions={transactions} />
              </Suspense>
            </CardContent>
          </Card>

          {/* Negotiation Log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🤝</span> Log Negosiasi Terakhir
              </CardTitle>
            </CardHeader>
            <CardContent>
              {negotiation ? (
                <Suspense fallback={<div>Loading...</div>}>
                  <NegotiationChat negotiation={negotiation} />
                </Suspense>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Belum ada negosiasi</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Inventory */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📦</span> Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inventory.length > 0 ? (
              <Suspense fallback={<div>Loading...</div>}>
                <InventoryTable items={inventory} />
              </Suspense>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Belum ada inventory</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
