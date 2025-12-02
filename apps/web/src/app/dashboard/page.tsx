import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from '@/components/dashboard/stats-card'
import { TransactionList } from '@/components/dashboard/transaction-list'
import { InventoryTable } from '@/components/dashboard/inventory-table'
import { NegotiationChat } from '@/components/dashboard/negotiation-chat'
import Link from 'next/link'

// Demo data - in production, fetch from Supabase
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

const grossProfit = totalSales - totalPurchases - totalExpenses

export default function DashboardPage() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Link href="/dashboard/catalog" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-center">
            <div className="text-3xl mb-2">📦</div>
            <div className="font-semibold">Katalog Produk</div>
          </Link>
          <Link href="/dashboard/contacts" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-center">
            <div className="text-3xl mb-2">👥</div>
            <div className="font-semibold">Kontak</div>
          </Link>
          <Link href="/dashboard/payments" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-center">
            <div className="text-3xl mb-2">💳</div>
            <div className="font-semibold">Pembayaran</div>
          </Link>
          <Link href="/dashboard/audit" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-center">
            <div className="text-3xl mb-2">📜</div>
            <div className="font-semibold">Audit Log</div>
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
                <TransactionList transactions={demoTransactions} />
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
              <Suspense fallback={<div>Loading...</div>}>
                <NegotiationChat negotiation={demoNegotiation} />
              </Suspense>
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
            <Suspense fallback={<div>Loading...</div>}>
              <InventoryTable items={demoInventory} />
            </Suspense>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
