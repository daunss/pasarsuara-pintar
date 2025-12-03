'use client'

import { Suspense, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from '@/components/dashboard/stats-card'
import { TransactionList } from '@/components/dashboard/transaction-list'
import { InventoryTable } from '@/components/dashboard/inventory-table'
import { NegotiationChat } from '@/components/dashboard/negotiation-chat'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase, type Transaction, type Inventory, type NegotiationLog } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [negotiation, setNegotiation] = useState<NegotiationLog | null>(null)
  const [loading, setLoading] = useState(true)

  // Authentication guard
  useEffect(() => {
    if (!authLoading && !user) {
      redirect('/login')
    }
  }, [user, authLoading])

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

  // Demo data - REMOVED, using real data now
  const demoTransactions = [
  {
    id: '1',
    user_id: '11111111-1111-1111-1111-111111111111',
    type: 'SALE' as const,
    product_name: 'Nasi Rames',
    qty: 15,
    price_per_unit: 12000,
    total_amount: 180000,
    raw_voice_text: 'Tadi laku nasi rames limolas porsi',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    user_id: '11111111-1111-1111-1111-111111111111',
    type: 'SALE' as const,
    product_name: 'Nasi Goreng',
    qty: 8,
    price_per_unit: 15000,
    total_amount: 120000,
    raw_voice_text: 'Nasi goreng payu wolung porsi',
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: '3',
    user_id: '11111111-1111-1111-1111-111111111111',
    type: 'PURCHASE' as const,
    product_name: 'Beras Premium',
    qty: 25,
    price_per_unit: 11800,
    total_amount: 295000,
    raw_voice_text: 'Tuku beras 25 kilo neng Pak Joyo',
    created_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: '4',
    user_id: '11111111-1111-1111-1111-111111111111',
    type: 'EXPENSE' as const,
    product_name: 'Gas LPG',
    qty: 2,
    price_per_unit: 22000,
    total_amount: 44000,
    raw_voice_text: 'Beli gas loro tabung',
    created_at: new Date(Date.now() - 10800000).toISOString()
  }
]

const demoInventory = [
  {
    id: '1',
    user_id: '11111111-1111-1111-1111-111111111111',
    product_name: 'Beras Premium',
    stock_qty: 25,
    unit: 'kg',
    min_sell_price: 13000,
    max_buy_price: 12000,
    description: 'Beras putih kualitas premium',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    user_id: '11111111-1111-1111-1111-111111111111',
    product_name: 'Minyak Goreng',
    stock_qty: 10,
    unit: 'liter',
    min_sell_price: 18000,
    max_buy_price: 16000,
    description: 'Minyak goreng sawit',
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    user_id: '11111111-1111-1111-1111-111111111111',
    product_name: 'Telur Ayam',
    stock_qty: 50,
    unit: 'butir',
    min_sell_price: 2500,
    max_buy_price: 2200,
    description: 'Telur ayam negeri segar',
    created_at: new Date().toISOString()
  },
  {
    id: '4',
    user_id: '11111111-1111-1111-1111-111111111111',
    product_name: 'Gula Pasir',
    stock_qty: 5,
    unit: 'kg',
    min_sell_price: 16000,
    max_buy_price: 14000,
    description: 'Gula pasir putih',
    created_at: new Date().toISOString()
  }
]

const demoNegotiation = {
  id: '1',
  buyer_id: '11111111-1111-1111-1111-111111111111',
  seller_id: '22222222-2222-2222-2222-222222222222',
  product_name: 'Beras Premium',
  initial_offer: 12000,
  final_price: 11800,
  status: 'SUCCESS' as const,
  transcript: {
    messages: [
      { role: 'buyer_agent', content: 'Saya butuh beras 25 kg, budget maksimal 12.000/kg' },
      { role: 'seller_agent', content: '[Pak Joyo] Stok ada 500 kg. Harga normal 12.500/kg, tapi untuk 25 kg bisa 12.200/kg' },
      { role: 'buyer_agent', content: 'Bisa 11.800/kg? Saya langganan tetap' },
      { role: 'seller_agent', content: '[Pak Joyo] Deal 11.800/kg untuk langganan. Total 295.000 untuk 25 kg' },
      { role: 'system', content: '✅ Negosiasi berhasil. Deal: 11.800/kg' }
    ]
  },
  created_at: new Date().toISOString(),
  completed_at: new Date().toISOString()
}

// Calculate stats
const totalSales = demoTransactions
  .filter(t => t.type === 'SALE')
  .reduce((sum, t) => sum + (t.total_amount || 0), 0)

const totalPurchases = demoTransactions
  .filter(t => t.type === 'PURCHASE')
  .reduce((sum, t) => sum + (t.total_amount || 0), 0)

const totalExpenses = demoTransactions
  .filter(t => t.type === 'EXPENSE')
  .reduce((sum, t) => sum + (t.total_amount || 0), 0)

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
}
