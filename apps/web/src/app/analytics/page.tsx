'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { supabase } from '@/lib/supabase'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface SalesTrendData {
  date: string
  sales: number
}

interface ProductPerformance {
  product_name: string
  total_sales: number
  quantity: number
}

interface CategoryData {
  category: string
  amount: number
}

function AnalyticsContent() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState(30) // days
  
  const [salesTrend, setSalesTrend] = useState<SalesTrendData[]>([])
  const [productPerformance, setProductPerformance] = useState<ProductPerformance[]>([])
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryData[]>([])
  const [profitData, setProfitData] = useState<any[]>([])

  useEffect(() => {
    console.log('Analytics useEffect triggered', { authLoading, user: !!user, dateRange })
    if (!authLoading && user) {
      setLoading(true)
      fetchAnalytics()
    } else if (!authLoading && !user) {
      setLoading(false)
    }
  }, [user?.id, authLoading, dateRange])

  const fetchAnalytics = async () => {
    try {
      console.log('Fetching analytics for user:', user?.id)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - dateRange)
      const startDateStr = startDate.toISOString()

      // Fetch transactions
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', startDateStr)
        .order('created_at', { ascending: true })

      console.log('Transactions fetched:', transactions?.length || 0)

      if (error) {
        console.error('Supabase error:', error)
        setLoading(false)
        return
      }

      // If no transactions, set empty data
      if (!transactions || transactions.length === 0) {
        console.log('No transactions found, showing empty state')
        setSalesTrend([])
        setProductPerformance([])
        setCategoryBreakdown([])
        setProfitData([])
        setLoading(false)
        return
      }

      // Process sales trend
      const salesByDate: Record<string, number> = {}
      const revenueByDate: Record<string, number> = {}
      const expensesByDate: Record<string, number> = {}
      
      transactions?.forEach(tx => {
        const date = tx.created_at.split('T')[0]
        
        if (tx.type === 'SALE') {
          salesByDate[date] = (salesByDate[date] || 0) + tx.total_amount
          revenueByDate[date] = (revenueByDate[date] || 0) + tx.total_amount
        } else if (tx.type === 'PURCHASE' || tx.type === 'EXPENSE') {
          expensesByDate[date] = (expensesByDate[date] || 0) + tx.total_amount
        }
      })

      const trendData = Object.keys(salesByDate).map(date => ({
        date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        sales: salesByDate[date]
      }))
      setSalesTrend(trendData)

      // Process profit data
      const allDates = new Set([...Object.keys(revenueByDate), ...Object.keys(expensesByDate)])
      const profitArray = Array.from(allDates).map(date => ({
        date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        revenue: revenueByDate[date] || 0,
        expenses: expensesByDate[date] || 0,
        profit: (revenueByDate[date] || 0) - (expensesByDate[date] || 0)
      }))
      setProfitData(profitArray)

      // Process product performance
      const productSales: Record<string, { total: number, qty: number }> = {}
      transactions?.forEach(tx => {
        if (tx.type === 'SALE') {
          if (!productSales[tx.product_name]) {
            productSales[tx.product_name] = { total: 0, qty: 0 }
          }
          productSales[tx.product_name].total += tx.total_amount
          productSales[tx.product_name].qty += tx.qty
        }
      })

      const performanceData = Object.entries(productSales)
        .map(([name, data]) => ({
          product_name: name,
          total_sales: data.total,
          quantity: data.qty
        }))
        .sort((a, b) => b.total_sales - a.total_sales)
        .slice(0, 10)
      setProductPerformance(performanceData)

      // Process category breakdown (expenses)
      const categories: Record<string, number> = {
        'Pembelian': 0,
        'Operasional': 0,
        'Lainnya': 0
      }
      
      transactions?.forEach(tx => {
        if (tx.type === 'PURCHASE') {
          categories['Pembelian'] += tx.total_amount
        } else if (tx.type === 'EXPENSE') {
          categories['Operasional'] += tx.total_amount
        }
      })

      const categoryData = Object.entries(categories)
        .filter(([_, amount]) => amount > 0)
        .map(([category, amount]) => ({ category, amount }))
      setCategoryBreakdown(categoryData)

    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value)
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📈 Analytics</h1>
              <p className="text-gray-600">Analisis performa bisnis Anda</p>
            </div>
            <div className="flex gap-2">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setDateRange(days)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    dateRange === days
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {days} Hari
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {authLoading || loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat analytics...</p>
          </div>
        ) : salesTrend.length === 0 && productPerformance.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Belum Ada Data</h3>
            <p className="text-gray-600">Tambahkan transaksi untuk melihat analytics</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Sales Trend Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Tren Penjualan</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} name="Penjualan" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Product Performance Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Top 10 Produk Terlaris</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="product_name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="total_sales" fill="#3b82f6" name="Total Penjualan" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Profit Analysis Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Analisis Laba Rugi</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={profitData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Pendapatan" />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Pengeluaran" />
                  <Line type="monotone" dataKey="profit" stroke="#8b5cf6" strokeWidth={2} name="Laba" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Category Breakdown */}
            {categoryBreakdown.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Breakdown Pengeluaran</h2>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.category}: ${formatCurrency(entry.amount)}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
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
