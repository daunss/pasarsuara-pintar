'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

interface SalesTrendData {
  date: string
  sales: number
  count: number
}

interface SalesTrendChartProps {
  dateRange: { from: Date; to: Date }
}

export function SalesTrendChart({ dateRange }: SalesTrendChartProps) {
  const { user } = useAuth()
  const [data, setData] = useState<SalesTrendData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchSalesTrend()
    }
  }, [user, dateRange])

  const fetchSalesTrend = async () => {
    try {
      setLoading(true)
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('type', 'SALE')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: true })

      if (error) throw error

      const salesByDate: Record<string, { sales: number; count: number }> = {}
      
      transactions?.forEach(tx => {
        const date = new Date(tx.created_at).toISOString().split('T')[0]
        if (!salesByDate[date]) {
          salesByDate[date] = { sales: 0, count: 0 }
        }
        salesByDate[date].sales += tx.total_amount
        salesByDate[date].count += 1
      })

      const chartData: SalesTrendData[] = []
      const currentDate = new Date(dateRange.from)
      const endDate = new Date(dateRange.to)

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0]
        const dayData = salesByDate[dateStr] || { sales: 0, count: 0 }
        
        chartData.push({
          date: currentDate.toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'short' 
          }),
          sales: dayData.sales,
          count: dayData.count
        })
        
        currentDate.setDate(currentDate.getDate() + 1)
      }

      setData(chartData)
    } catch (error) {
      console.error('Error fetching sales trend:', error)
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
          <div className="text-4xl mb-2">📈</div>
          <p>Tidak ada data penjualan</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${(value / 1000)}k`}
          />
          <Tooltip 
            formatter={(value: number, name: string) => [
              name === 'sales' ? formatCurrency(value) : value,
              name === 'sales' ? 'Penjualan' : 'Jumlah Transaksi'
            ]}
            labelFormatter={(label) => `Tanggal: ${label}`}
          />
          <Line 
            type="monotone" 
            dataKey="sales" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
