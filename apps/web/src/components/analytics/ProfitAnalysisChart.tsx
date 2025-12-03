'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

interface ProfitAnalysisData {
  date: string
  revenue: number
  expenses: number
  profit: number
}

interface ProfitAnalysisChartProps {
  dateRange: { from: Date; to: Date }
}

export function ProfitAnalysisChart({ dateRange }: ProfitAnalysisChartProps) {
  const { user } = useAuth()
  const [data, setData] = useState<ProfitAnalysisData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchProfitAnalysis()
    }
  }, [user, dateRange])

  const fetchProfitAnalysis = async () => {
    try {
      setLoading(true)
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: true })

      if (error) throw error

      const dailyData: Record<string, { revenue: number; expenses: number }> = {}
      
      transactions?.forEach(tx => {
        const date = new Date(tx.created_at).toISOString().split('T')[0]
        if (!dailyData[date]) {
          dailyData[date] = { revenue: 0, expenses: 0 }
        }
        
        if (tx.type === 'SALE') {
          dailyData[date].revenue += tx.total_amount
        } else if (tx.type === 'PURCHASE' || tx.type === 'EXPENSE') {
          dailyData[date].expenses += tx.total_amount
        }
      })

      const chartData: ProfitAnalysisData[] = []
      const currentDate = new Date(dateRange.from)
      const endDate = new Date(dateRange.to)

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0]
        const dayData = dailyData[dateStr] || { revenue: 0, expenses: 0 }
        
        chartData.push({
          date: currentDate.toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'short' 
          }),
          revenue: dayData.revenue,
          expenses: dayData.expenses,
          profit: dayData.revenue - dayData.expenses
        })
        
        currentDate.setDate(currentDate.getDate() + 1)
      }

      setData(chartData)
    } catch (error) {
      console.error('Error fetching profit analysis:', error)
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
          <div className="text-4xl mb-2">💰</div>
          <p>Tidak ada data profit</p>
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
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                revenue: 'Revenue',
                expenses: 'Pengeluaran',
                profit: 'Profit'
              }
              return [formatCurrency(value), labels[name] || name]
            }}
            labelFormatter={(label) => `Tanggal: ${label}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="revenue" 
            stroke="#10b981" 
            strokeWidth={2}
            name="Revenue"
          />
          <Line 
            type="monotone" 
            dataKey="expenses" 
            stroke="#ef4444" 
            strokeWidth={2}
            name="Pengeluaran"
          />
          <Line 
            type="monotone" 
            dataKey="profit" 
            stroke="#3b82f6" 
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Profit"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
