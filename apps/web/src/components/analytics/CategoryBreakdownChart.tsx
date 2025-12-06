'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

interface CategoryData {
  name: string
  value: number
  percentage: number
}

interface CategoryBreakdownChartProps {
  dateRange: { from: Date; to: Date }
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export function CategoryBreakdownChart({ dateRange }: CategoryBreakdownChartProps) {
  const { user } = useAuth()
  const [data, setData] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchCategoryBreakdown()
    }
  }, [user, dateRange])

  const fetchCategoryBreakdown = async () => {
    try {
      setLoading(true)
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .in('type', ['PURCHASE', 'EXPENSE'])
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())

      if (error) throw error

      // Group by transaction type
      const categoryTotals: Record<string, number> = {}
      let totalAmount = 0
      
      transactions?.forEach(tx => {
        const category = tx.type === 'PURCHASE' ? 'Pembelian' : 'Pengeluaran'
        categoryTotals[category] = (categoryTotals[category] || 0) + tx.total_amount
        totalAmount += tx.total_amount
      })

      // Convert to chart data
      const chartData: CategoryData[] = Object.entries(categoryTotals).map(([name, value]) => ({
        name,
        value,
        percentage: totalAmount > 0 ? (value / totalAmount) * 100 : 0
      }))

      setData(chartData)
    } catch (error) {
      console.error('Error fetching category breakdown:', error)
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
          <div className="text-4xl mb-2">🎯</div>
          <p>Tidak ada data kategori</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data as any}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(props: any) => `${props.name}: ${props.percentage?.toFixed(1) || 0}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => formatCurrency(value)}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
