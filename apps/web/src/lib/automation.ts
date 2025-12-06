/**
 * Smart Automation Service
 * Handles auto-reorder, auto-alerts, and smart notifications
 */

import { supabase, type Inventory } from './supabase'

export interface AutomationRule {
  id: string
  user_id: string
  type: 'LOW_STOCK_ALERT' | 'AUTO_REORDER' | 'PRICE_ALERT' | 'EXPIRY_ALERT'
  product_name?: string
  threshold?: number
  action: string
  enabled: boolean
  created_at: string
}

export interface AutomationLog {
  id: string
  user_id: string
  rule_id: string
  action: string
  status: 'SUCCESS' | 'FAILED' | 'PENDING'
  details: any
  created_at: string
}

/**
 * Check inventory for low stock and trigger alerts
 */
export async function checkLowStockAlerts(userId: string): Promise<{
  alerts: Array<{ product: string; currentStock: number; threshold: number }>
  triggered: number
}> {
  try {
    // Fetch inventory
    const { data: inventory, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error

    const alerts: Array<{ product: string; currentStock: number; threshold: number }> = []

    // Check each item for low stock
    inventory?.forEach(item => {
      const threshold = calculateReorderPoint(item)
      if ((item.stock_qty || 0) <= threshold) {
        alerts.push({
          product: item.product_name,
          currentStock: item.stock_qty || 0,
          threshold
        })
      }
    })

    return {
      alerts,
      triggered: alerts.length
    }
  } catch (error) {
    console.error('Error checking low stock alerts:', error)
    return { alerts: [], triggered: 0 }
  }
}

/**
 * Calculate reorder point based on historical data
 * Uses simple heuristic: 20% of average stock or minimum 5 units
 */
function calculateReorderPoint(item: Inventory): number {
  const avgStock = item.stock_qty || 0
  const reorderPoint = Math.max(Math.ceil(avgStock * 0.2), 5)
  return reorderPoint
}

/**
 * Generate auto-reorder suggestions
 */
export async function generateAutoReorderSuggestions(userId: string): Promise<Array<{
  product: string
  currentStock: number
  suggestedOrder: number
  estimatedCost: number
  reason: string
}>> {
  try {
    // Fetch inventory
    const { data: inventory, error: invError } = await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', userId)

    if (invError) throw invError

    // Fetch recent sales to calculate demand
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'SALE')
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (txError) throw txError

    // Calculate demand per product
    const demandMap = new Map<string, number>()
    transactions?.forEach(tx => {
      if (tx.product_name) {
        demandMap.set(
          tx.product_name,
          (demandMap.get(tx.product_name) || 0) + (tx.qty || 0)
        )
      }
    })

    // Generate suggestions
    const suggestions: Array<{
      product: string
      currentStock: number
      suggestedOrder: number
      estimatedCost: number
      reason: string
    }> = []

    inventory?.forEach(item => {
      const monthlyDemand = demandMap.get(item.product_name) || 0
      const dailyDemand = monthlyDemand / 30
      const currentStock = item.stock_qty || 0
      const reorderPoint = calculateReorderPoint(item)

      // Suggest reorder if stock is low
      if (currentStock <= reorderPoint) {
        // Suggest ordering for 2 weeks of demand
        const suggestedOrder = Math.ceil(dailyDemand * 14)
        const estimatedCost = suggestedOrder * (item.max_buy_price || 0)

        suggestions.push({
          product: item.product_name,
          currentStock,
          suggestedOrder,
          estimatedCost,
          reason: `Stock rendah (${currentStock} unit). Demand harian: ${dailyDemand.toFixed(1)} unit`
        })
      }
    })

    return suggestions.sort((a, b) => b.estimatedCost - a.estimatedCost)
  } catch (error) {
    console.error('Error generating reorder suggestions:', error)
    return []
  }
}

/**
 * Predict sales for next period
 */
export async function predictSales(
  userId: string,
  days: number = 7
): Promise<{
  prediction: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  trend: 'UP' | 'DOWN' | 'STABLE'
}> {
  try {
    // Fetch historical sales
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'SALE')
      .order('created_at', { ascending: true })

    if (error) throw error

    if (!transactions || transactions.length < 7) {
      return {
        prediction: 0,
        confidence: 'LOW',
        trend: 'STABLE'
      }
    }

    // Calculate daily sales for last 30 days
    const dailySales = new Map<string, number>()
    transactions.forEach(tx => {
      const date = new Date(tx.created_at).toDateString()
      dailySales.set(date, (dailySales.get(date) || 0) + tx.total_amount)
    })

    const salesArray = Array.from(dailySales.values())
    const avgDailySales = salesArray.reduce((sum, val) => sum + val, 0) / salesArray.length

    // Simple linear regression for trend
    const recentSales = salesArray.slice(-7)
    const olderSales = salesArray.slice(-14, -7)
    
    const recentAvg = recentSales.reduce((sum, val) => sum + val, 0) / recentSales.length
    const olderAvg = olderSales.reduce((sum, val) => sum + val, 0) / olderSales.length

    let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE'
    if (recentAvg > olderAvg * 1.1) trend = 'UP'
    else if (recentAvg < olderAvg * 0.9) trend = 'DOWN'

    // Adjust prediction based on trend
    let prediction = avgDailySales * days
    if (trend === 'UP') prediction *= 1.1
    else if (trend === 'DOWN') prediction *= 0.9

    // Calculate confidence based on data consistency
    const variance = salesArray.reduce((sum, val) => sum + Math.pow(val - avgDailySales, 2), 0) / salesArray.length
    const stdDev = Math.sqrt(variance)
    const cv = stdDev / avgDailySales // Coefficient of variation

    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'
    if (cv < 0.3) confidence = 'HIGH'
    else if (cv > 0.6) confidence = 'LOW'

    return {
      prediction: Math.round(prediction),
      confidence,
      trend
    }
  } catch (error) {
    console.error('Error predicting sales:', error)
    return {
      prediction: 0,
      confidence: 'LOW',
      trend: 'STABLE'
    }
  }
}

/**
 * Analyze product demand patterns
 */
export async function analyzeProductDemand(
  userId: string,
  productName: string
): Promise<{
  avgDailyDemand: number
  peakDay: string
  trend: 'INCREASING' | 'DECREASING' | 'STABLE'
  seasonality: boolean
}> {
  try {
    // Fetch sales for this product
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'SALE')
      .eq('product_name', productName)
      .order('created_at', { ascending: true })

    if (error) throw error

    if (!transactions || transactions.length < 7) {
      return {
        avgDailyDemand: 0,
        peakDay: 'N/A',
        trend: 'STABLE',
        seasonality: false
      }
    }

    // Calculate daily demand
    const dailyDemand = new Map<string, number>()
    const dayOfWeekDemand = new Map<string, number>()

    transactions.forEach(tx => {
      const date = new Date(tx.created_at)
      const dateStr = date.toDateString()
      const dayOfWeek = date.toLocaleDateString('id-ID', { weekday: 'long' })

      dailyDemand.set(dateStr, (dailyDemand.get(dateStr) || 0) + (tx.qty || 0))
      dayOfWeekDemand.set(dayOfWeek, (dayOfWeekDemand.get(dayOfWeek) || 0) + (tx.qty || 0))
    })

    // Calculate average
    const totalDemand = Array.from(dailyDemand.values()).reduce((sum, val) => sum + val, 0)
    const avgDailyDemand = totalDemand / dailyDemand.size

    // Find peak day
    let peakDay = 'N/A'
    let maxDemand = 0
    dayOfWeekDemand.forEach((demand, day) => {
      if (demand > maxDemand) {
        maxDemand = demand
        peakDay = day
      }
    })

    // Detect trend
    const demandArray = Array.from(dailyDemand.values())
    const firstHalf = demandArray.slice(0, Math.floor(demandArray.length / 2))
    const secondHalf = demandArray.slice(Math.floor(demandArray.length / 2))

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length

    let trend: 'INCREASING' | 'DECREASING' | 'STABLE' = 'STABLE'
    if (secondAvg > firstAvg * 1.2) trend = 'INCREASING'
    else if (secondAvg < firstAvg * 0.8) trend = 'DECREASING'

    // Detect seasonality (simple check: variance in day-of-week demand)
    const avgDayDemand = Array.from(dayOfWeekDemand.values()).reduce((sum, val) => sum + val, 0) / dayOfWeekDemand.size
    const variance = Array.from(dayOfWeekDemand.values()).reduce((sum, val) => sum + Math.pow(val - avgDayDemand, 2), 0) / dayOfWeekDemand.size
    const seasonality = variance > avgDayDemand * 0.5

    return {
      avgDailyDemand: Math.round(avgDailyDemand * 10) / 10,
      peakDay,
      trend,
      seasonality
    }
  } catch (error) {
    console.error('Error analyzing product demand:', error)
    return {
      avgDailyDemand: 0,
      peakDay: 'N/A',
      trend: 'STABLE',
      seasonality: false
    }
  }
}

/**
 * Generate smart notifications
 */
export async function generateSmartNotifications(userId: string): Promise<Array<{
  type: 'INFO' | 'WARNING' | 'ALERT'
  title: string
  message: string
  action?: string
}>> {
  const notifications: Array<{
    type: 'INFO' | 'WARNING' | 'ALERT'
    title: string
    message: string
    action?: string
  }> = []

  try {
    // Check low stock
    const { alerts } = await checkLowStockAlerts(userId)
    alerts.forEach(alert => {
      notifications.push({
        type: 'WARNING',
        title: 'Stock Menipis',
        message: `${alert.product}: ${alert.currentStock} unit tersisa (threshold: ${alert.threshold})`,
        action: 'Reorder sekarang'
      })
    })

    // Check sales prediction
    const { prediction, trend } = await predictSales(userId, 7)
    if (trend === 'DOWN') {
      notifications.push({
        type: 'ALERT',
        title: 'Trend Penjualan Menurun',
        message: `Prediksi penjualan 7 hari ke depan: Rp ${prediction.toLocaleString('id-ID')}. Pertimbangkan promosi.`,
        action: 'Buat promosi'
      })
    } else if (trend === 'UP') {
      notifications.push({
        type: 'INFO',
        title: 'Trend Penjualan Meningkat',
        message: `Prediksi penjualan 7 hari ke depan: Rp ${prediction.toLocaleString('id-ID')}. Pastikan stock cukup!`,
        action: 'Cek inventory'
      })
    }

    // Check reorder suggestions
    const suggestions = await generateAutoReorderSuggestions(userId)
    if (suggestions.length > 0) {
      notifications.push({
        type: 'INFO',
        title: 'Saran Reorder',
        message: `${suggestions.length} produk perlu di-reorder. Total estimasi: Rp ${suggestions.reduce((sum, s) => sum + s.estimatedCost, 0).toLocaleString('id-ID')}`,
        action: 'Lihat detail'
      })
    }

    return notifications
  } catch (error) {
    console.error('Error generating notifications:', error)
    return []
  }
}
