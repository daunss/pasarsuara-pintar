'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { supabase } from '@/lib/supabase'
import { exportAnalyticsToCSV, printPageAsPDF } from '@/lib/export'
import Link from 'next/link'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Bar, Pie } from 'react-chartjs-2'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface AnalyticsData {
  salesTrend: { date: string; amount: number }[]
  productPerformance: { product: string; revenue: number; quantity: number }[]
  revenueBreakdown: { type: string; amount: number }[]
  customerSegments: { segment: string; count: number; revenue: number }[]
}

function AnalyticsContent() {
  const { user } = useAuth()
  const [data, setData] = useState<AnalyticsData>({
    salesTrend: [],
    productPerformance: [],
    revenueBreakdown: [],
    customerSegments: []
  })
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7d') // 7d, 30d, 90d, all
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [avgTransactionValue, setAvgTransactionValue] = useState(0)

  useEffect(() => {
    if (user) {
      fetchAnalytics()
    }
  }, [user, dateRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)

      // Calculate date filter
      let dateFilter = new Date()
      if (dateRange === '7d') {
        dateFilter.setDate(dateFilter.getDate() - 7)
      } else if (dateRange === '30d') {
        dateFilter.setDate(dateFilter.getDate() - 30)
      } else if (dateRange === '90d') {
        dateFilter.setDate(dateFilter.getDate() - 90)
      } else {
        dateFilter = new Date('2000-01-01') // All time
      }

      // Fetch transactions
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', dateFilter.toISOString())
        .order('created_at', { ascending: true })

      if (error) throw error

      // Process sales trend (daily aggregation)
      const salesByDate = new Map<string, number>()
      transactions?.forEach(tx => {
        if (tx.type === 'SALE') {
          const date = new Date(tx.created_at).toLocaleDateString('id-ID')
          salesByDate.set(date, (salesByDate.get(date) || 0) + tx.total_amount)
        }
      })
      const salesTrend = Array.from(salesByDate.entries()).map(([date, amount]) => ({
        date,
        amount
      }))

      // Process product performance
      const productStats = new Map<string, { revenue: number; quantity: number }>()
      transactions?.forEach(tx => {
        if (tx.type === 'SALE' && tx.product_name) {
          const current = productStats.get(tx.product_name) || { revenue: 0, quantity: 0 }
          productStats.set(tx.product_name, {
            revenue: current.revenue + tx.total_amount,
            quantity: current.quantity + (tx.qty || 0)
          })
        }
      })
      const productPerformance = Array.from(productStats.entries())
        .map(([product, stats]) => ({ product, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10) // Top 10 products

      // Process revenue breakdown
      const revenueByType = new Map<string, number>()
      transactions?.forEach(tx => {
        revenueByType.set(tx.type, (revenueByType.get(tx.type) || 0) + tx.total_amount)
      })
      const revenueBreakdown = Array.from(revenueByType.entries()).map(([type, amount]) => ({
        type,
        amount
      }))

      // Calculate summary metrics
      const salesTransactions = transactions?.filter(tx => tx.type === 'SALE') || []
      const totalRev = salesTransactions.reduce((sum, tx) => sum + tx.total_amount, 0)
      const totalTx = salesTransactions.length
      const avgTx = totalTx > 0 ? totalRev / totalTx : 0

      setTotalRevenue(totalRev)
      setTotalTransactions(totalTx)
      setAvgTransactionValue(avgTx)

      setData({
        salesTrend,
        productPerformance,
        revenueBreakdown,
        customerSegments: [] // TODO: Implement customer segmentation
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
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

  // Chart configurations
  const salesTrendChartData = {
    labels: data.salesTrend.map(d => d.date),
    datasets: [
      {
        label: 'Penjualan',
        data: data.salesTrend.map(d => d.amount),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  }

  const productPerformanceChartData = {
    labels: data.productPerformance.map(p => p.product),
    datasets: [
      {
        label: 'Revenue',
        data: data.productPerformance.map(p => p.revenue),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(14, 165, 233, 0.8)',
          'rgba(132, 204, 22, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(244, 63, 94, 0.8)'
        ]
      }
    ]
  }

  const revenueBreakdownChartData = {
    labels: data.revenueBreakdown.map(r => r.type),
    datasets: [
      {
        data: data.revenueBreakdown.map(r => r.amount),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(251, 146, 60, 0.8)'
        ]
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat analytics...</p>
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📊 Advanced Analytics</h1>
              <p className="text-gray-600">Business intelligence & insights</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="bg-white border-2 border-green-600 text-green-600 px-4 py-2 rounded-lg font-semibold hover:bg-green-50 transition"
              >
                ← Dashboard
              </Link>
              <button
                onClick={() => exportAnalyticsToCSV(data, `analytics-${dateRange}.csv`)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                📊 Export Excel
              </button>
              <button
                onClick={printPageAsPDF}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                📄 Export PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-gray-700 font-medium">Periode:</span>
            <div className="flex gap-2">
              {['7d', '30d', '90d', 'all'].map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    dateRange === range
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range === '7d' && '7 Hari'}
                  {range === '30d' && '30 Hari'}
                  {range === '90d' && '90 Hari'}
                  {range === 'all' && 'Semua'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600 text-sm font-medium">Total Revenue</span>
              <span className="text-3xl">💰</span>
            </div>
            <div className="text-3xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
            <p className="text-sm text-gray-500 mt-2">Dari {totalTransactions} transaksi</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600 text-sm font-medium">Rata-rata Transaksi</span>
              <span className="text-3xl">📊</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">{formatCurrency(avgTransactionValue)}</div>
            <p className="text-sm text-gray-500 mt-2">Per transaksi</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600 text-sm font-medium">Total Transaksi</span>
              <span className="text-3xl">📝</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">{totalTransactions}</div>
            <p className="text-sm text-gray-500 mt-2">Transaksi penjualan</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Sales Trend Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">📈 Trend Penjualan</h2>
            <div className="h-80">
              {data.salesTrend.length > 0 ? (
                <Line data={salesTrendChartData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Belum ada data penjualan
                </div>
              )}
            </div>
          </div>

          {/* Revenue Breakdown Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">🥧 Breakdown Revenue</h2>
            <div className="h-80">
              {data.revenueBreakdown.length > 0 ? (
                <Pie data={revenueBreakdownChartData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Belum ada data
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Performance Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">🏆 Top 10 Produk Terlaris</h2>
          <div className="h-96">
            {data.productPerformance.length > 0 ? (
              <Bar data={productPerformanceChartData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Belum ada data produk
              </div>
            )}
          </div>
        </div>

        {/* Product Performance Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">📊 Detail Performa Produk</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Produk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Quantity Sold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Avg Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.productPerformance.map((product, index) => (
                  <tr key={product.product} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-2xl">
                        {index === 0 && '🥇'}
                        {index === 1 && '🥈'}
                        {index === 2 && '🥉'}
                        {index > 2 && `#${index + 1}`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{product.product}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-900">{product.quantity} unit</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-green-600">
                        {formatCurrency(product.revenue)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-900">
                        {formatCurrency(product.revenue / product.quantity)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsContent />
    </ProtectedRoute>
  )
}
