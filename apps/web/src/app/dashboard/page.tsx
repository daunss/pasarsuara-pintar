'use client'

import { Suspense, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from '@/components/dashboard/stats-card'
import { TransactionList } from '@/components/dashboard/transaction-list'
import { InventoryTable } from '@/components/dashboard/inventory-table'
import { NegotiationChat } from '@/components/dashboard/negotiation-chat'
import { ShopeeImport } from '@/components/inventory/ShopeeImport'
import { BulkImport } from '@/components/inventory/BulkImport'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase, type Transaction, type Inventory, type NegotiationLog } from '@/lib/supabase'
import { Logo } from '@/components/ui/logo'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [negotiation, setNegotiation] = useState<NegotiationLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [showShopeeImport, setShowShopeeImport] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)

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

  // Shared header component
  const renderHeader = () => (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="md" showText={true} href="/" />
            <nav className="hidden md:flex items-center gap-1 ml-4">
              <Link href="/dashboard" className="px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg">
                Dashboard
              </Link>
              <Link href="/inventory" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition">
                Inventory
              </Link>
              <Link href="/transactions" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition">
                Transaksi
              </Link>
              <Link href="/analytics" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition">
                Analytics
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {/* Profile Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 text-sm text-gray-700 hover:text-green-600 transition">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-semibold">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden md:block">{user?.email}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">{user?.email}</p>
                  <p className="text-xs text-gray-500 mt-1">UMKM User</p>
                </div>
                
                <div className="py-2">
                  <Link
                    href="/setup-whatsapp"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition"
                  >
                    <span className="text-lg">📱</span>
                    <div>
                      <p className="font-medium">Setup WhatsApp</p>
                      <p className="text-xs text-gray-500">Tambah/ubah nomor WA</p>
                    </div>
                  </Link>
                  
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition"
                  >
                    <span className="text-lg">⚙️</span>
                    <div>
                      <p className="font-medium">Pengaturan</p>
                      <p className="text-xs text-gray-500">Preferensi akun</p>
                    </div>
                  </Link>
                  
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut()
                      router.push('/login')
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <span className="text-lg">🚪</span>
                    <div className="text-left">
                      <p className="font-medium">Logout</p>
                      <p className="text-xs text-red-500">Keluar dari akun</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )

  return hasNoData ? (
    <div className="min-h-screen bg-gray-50">
      {renderHeader()}

      {/* Mobile nav */}
      <div className="md:hidden bg-white border-b px-4 py-2 flex gap-2 overflow-x-auto">
        <Link href="/dashboard" className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-full whitespace-nowrap">Dashboard</Link>
        <Link href="/inventory" className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-full whitespace-nowrap">Inventory</Link>
        <Link href="/transactions" className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-full whitespace-nowrap">Transaksi</Link>
        <Link href="/analytics" className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-full whitespace-nowrap">Analytics</Link>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Quick Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Link href="/transactions" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-center">
            <div className="text-3xl mb-2">📝</div>
            <div className="font-semibold text-sm">Transaksi</div>
          </Link>
          <Link href="/analytics" className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow hover:shadow-lg transition text-center">
            <div className="text-3xl mb-2">📊</div>
            <div className="font-semibold text-sm">Analytics</div>
          </Link>
          <Link href="/automation" className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg shadow hover:shadow-lg transition text-center">
            <div className="text-3xl mb-2">🤖</div>
            <div className="font-semibold text-sm">Automation</div>
          </Link>
          <Link href="/inventory" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-center">
            <div className="text-3xl mb-2">📦</div>
            <div className="font-semibold text-sm">Inventory</div>
          </Link>
          <Link href="/dashboard/contacts" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-center">
            <div className="text-3xl mb-2">👥</div>
            <div className="font-semibold text-sm">Kontak</div>
          </Link>
          <Link href="/dashboard/settings" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-center">
            <div className="text-3xl mb-2">⚙️</div>
            <div className="font-semibold text-sm">Pengaturan</div>
          </Link>
        </div>

        {/* Onboarding - Mulai Dari Mana? */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Selamat Datang! 👋</h2>
          <p className="text-gray-500 mb-6">Mulai kelola bisnis Anda. Pilih cara untuk menambahkan produk &amp; transaksi:</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Import Shopee */}
            <button
              onClick={() => setShowShopeeImport(true)}
              className="bg-white border-2 border-dashed border-orange-300 hover:border-orange-500 hover:bg-orange-50 rounded-xl p-6 text-left transition group"
            >
              <div className="text-4xl mb-3">🛒</div>
              <h3 className="font-bold text-gray-800 group-hover:text-orange-600 mb-1">Import dari Shopee</h3>
              <p className="text-xs text-gray-500">Scrape produk langsung dari toko Shopee Anda</p>
            </button>

            {/* Import Excel/CSV */}
            <button
              onClick={() => setShowBulkImport(true)}
              className="bg-white border-2 border-dashed border-green-300 hover:border-green-500 hover:bg-green-50 rounded-xl p-6 text-left transition group"
            >
              <div className="text-4xl mb-3">📄</div>
              <h3 className="font-bold text-gray-800 group-hover:text-green-600 mb-1">Upload Excel / CSV</h3>
              <p className="text-xs text-gray-500">Import daftar produk dari file spreadsheet</p>
            </button>

            {/* Manual Entry */}
            <Link
              href="/inventory"
              className="bg-white border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 rounded-xl p-6 text-left transition group"
            >
              <div className="text-4xl mb-3">✏️</div>
              <h3 className="font-bold text-gray-800 group-hover:text-blue-600 mb-1">Tambah Manual</h3>
              <p className="text-xs text-gray-500">Input produk satu per satu di halaman Inventory</p>
            </Link>

            {/* WhatsApp */}
            <Link
              href="/setup-whatsapp"
              className="bg-white border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 rounded-xl p-6 text-left transition group"
            >
              <div className="text-4xl mb-3">💬</div>
              <h3 className="font-bold text-gray-800 group-hover:text-emerald-600 mb-1">Via WhatsApp</h3>
              <p className="text-xs text-gray-500">Kirim voice message untuk catat transaksi otomatis</p>
            </Link>
          </div>
        </div>

        {/* Example WA prompt */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-lg">
          <p className="text-sm font-semibold text-gray-700 mb-2">💡 Tips: Kirim voice message ke WhatsApp:</p>
          <p className="font-mono text-sm bg-white p-3 rounded border">
            &quot;Tadi laku nasi goreng 10 porsi harga 15 ribu&quot;
          </p>
          <p className="text-xs text-gray-500 mt-2">Transaksi akan tercatat otomatis di dashboard Anda.</p>
        </div>
      </main>

      {/* Shopee Import Modal */}
      {showShopeeImport && (
        <ShopeeImport
          onComplete={() => {
            setShowShopeeImport(false)
            window.location.reload()
          }}
          onClose={() => setShowShopeeImport(false)}
        />
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <BulkImport
          onComplete={() => {
            setShowBulkImport(false)
            window.location.reload()
          }}
          onClose={() => setShowBulkImport(false)}
        />
      )}
    </div>
  ) : (
    <div className="min-h-screen bg-gray-50">
      {renderHeader()}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Link href="/transactions" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-center">
            <div className="text-3xl mb-2">📝</div>
            <div className="font-semibold">Transaksi</div>
          </Link>
          <Link href="/analytics" className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow hover:shadow-lg transition text-center">
            <div className="text-3xl mb-2">📊</div>
            <div className="font-semibold">Analytics</div>
          </Link>
          <Link href="/automation" className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg shadow hover:shadow-lg transition text-center">
            <div className="text-3xl mb-2">🤖</div>
            <div className="font-semibold">Automation</div>
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
