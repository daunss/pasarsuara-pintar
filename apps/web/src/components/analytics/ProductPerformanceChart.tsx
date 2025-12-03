'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

interface ProductPerformance {
  product_name: string
  total_sales: number
  quantity: number
  revenue: number
}

interface ProductPerformanceChartProps {
  limit: number
  dateRange: { from: Date; to: Date }
}

export function ProductPerformanceChart({ limit, dateRange }: ProductPerformanceChartProps) {
  const { user } = useAuth()
  const [data, setData] = useState<ProductPerformance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchProductPerformance()
    }
  }, [user, dateRange, limit])

  const fetchProductPerformance = async () => {
    try {
      setLoading(true)
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('type', 'SALE')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())

      if (error) throw error

      const productStats: Record<string, { quantity: number; revenue: number; count: number }> = {}
      
      transactions?.forEach(tx => {
        const product = tx.product_name
        if (!productStats[product]) {
          productStats[product] = { quantity: 0, revenue: 0, count: 0 }
        }
        productStats[product].quantity += tx.qty
        productStats[product].revenue += tx.total_amount
        productStats[product].count += 1
      })

      const chartData: ProductPerformance[] = Object.entries(productStats)
        .map(([product_name, stats]) => ({
          product_name: product_name.length > 15 ? product_name.substring(0, 15) + '...' : product_name,
          total_sales: stats.count,
          quantity: stats.quantity,
          revenue: stats.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit)

      setData(chartData)
    } catch (error) {
      console.error('Error fetching product performance:', error)
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

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">🏆</div>
          <p>Tidak ada data produk</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="product_name" 
            tick={{ fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${(value / 1000)}k`}
          />
          <Tooltip 
            formatter={(value: number, name: string) => {
              if (name === 'revenue') return [formatCurrency(value), 'Revenue']
              if (name === 'quantity') return [value, 'Qty Terjual']
              return [value, 'Total Penjualan']
            }}
            labelFormatter={(label) => `Produk: ${label}`}
          />
          <Bar 
            dataKey="revenue" 
            fill="#10b981" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
