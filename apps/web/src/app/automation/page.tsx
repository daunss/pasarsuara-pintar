'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import {
  checkLowStockAlerts,
  generateAutoReorderSuggestions,
  predictSales,
  generateSmartNotifications
} from '@/lib/automation'
import Link from 'next/link'

function AutomationContent() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [lowStockAlerts, setLowStockAlerts] = useState<Array<{
    product: string
    currentStock: number
    threshold: number
  }>>([])
  const [reorderSuggestions, setReorderSuggestions] = useState<Array<{
    product: string
    currentStock: number
    suggestedOrder: number
    estimatedCost: number
    reason: string
  }>>([])
  const [salesPrediction, setSalesPrediction] = useState<{
    prediction: number
    confidence: 'HIGH' | 'MEDIUM' | 'LOW'
    trend: 'UP' | 'DOWN' | 'STABLE'
  }>({ prediction: 0, confidence: 'LOW', trend: 'STABLE' })
  const [notifications, setNotifications] = useState<Array<{
    type: 'INFO' | 'WARNING' | 'ALERT'
    title: string
    message: string
    action?: string
  }>>([])

  useEffect(() => {
    if (user) {
      loadAutomationData()
    }
  }, [user])

  const loadAutomationData = async () => {
    try {
      setLoading(true)

      // Load all automation data in parallel
      const [alerts, suggestions, prediction, notifs] = await Promise.all([
        checkLowStockAlerts(user!.id),
        generateAutoReorderSuggestions(user!.id),
        predictSales(user!.id, 7),
        generateSmartNotifications(user!.id)
      ])

      setLowStockAlerts(alerts.alerts)
      setReorderSuggestions(suggestions)
      setSalesPrediction(prediction)
      setNotifications(notifs)
    } catch (error) {
      console.error('Error loading automation data:', error)
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

  const getTrendIcon = (trend: string) => {
    if (trend === 'UP') return '📈'
    if (trend === 'DOWN') return '📉'
    return '➡️'
  }

  const handleNotificationAction = (action?: string) => {
    if (!action) return

    if (action === 'Buat promosi') {
      router.push('/integrations')
      return
    }

    if (action === 'Cek inventory' || action === 'Reorder sekarang') {
      router.push('/inventory')
      return
    }

    if (action === 'Lihat detail') {
      const section = document.getElementById('reorder-suggestions')
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  const getConfidenceColor = (confidence: string) => {
    if (confidence === 'HIGH') return 'text-forest'
    if (confidence === 'MEDIUM') return 'text-yellow-600'
    return 'text-red-600'
  }

  const getNotificationColor = (type: string) => {
    if (type === 'INFO') return 'bg-cream-light border-terra/30 text-terra-dark'
    if (type === 'WARNING') return 'bg-yellow-50 border-yellow-200 text-yellow-800'
    return 'bg-red-50 border-red-200 text-red-800'
  }

  if (loading) {
    return (
      <div className="page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-forest mx-auto mb-4"></div>
          <p className="text-muted">Memuat automation data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-bg">
      {/* Header */}
      <header className="page-header">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-display text-charcoal">🤖 Smart Automation</h1>
              <p className="text-sm sm:text-base text-muted">AI-powered business automation & insights</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Link
                href="/dashboard"
                className="bg-white border-2 border-forest text-forest px-3 sm:px-4 py-2 rounded-2xl text-sm sm:text-base font-semibold hover:bg-cream-light transition"
              >
                ← Dashboard
              </Link>
              <button
                onClick={loadAutomationData}
                className="bg-forest text-white px-3 sm:px-4 py-2 rounded-2xl text-sm sm:text-base font-semibold hover:bg-forest-dark transition"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        {/* Smart Notifications */}
        <div className="mb-8">
          <h2 className="text-xl font-bold font-display mb-4">🔔 Smart Notifications</h2>
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="card-warm p-6 text-center text-muted">
                Tidak ada notifikasi saat ini
              </div>
            ) : (
              notifications.map((notif, index) => (
                <div
                  key={index}
                  className={`rounded-lg border-2 p-4 ${getNotificationColor(notif.type)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold mb-1">{notif.title}</h3>
                      <p className="text-sm">{notif.message}</p>
                    </div>
                    {notif.action && (
                      <button
                        onClick={() => handleNotificationAction(notif.action)}
                        className="ml-4 px-3 py-1 bg-white rounded-2xl text-sm font-medium hover:bg-cream-light transition"
                      >
                        {notif.action}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sales Prediction */}
        <div className="card-warm p-6 mb-8">
          <h2 className="text-xl font-bold font-display mb-4">📊 Sales Prediction (7 Days)</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-muted text-sm mb-2">Predicted Revenue</p>
              <p className="text-3xl font-bold text-forest">
                {formatCurrency(salesPrediction.prediction)}
              </p>
            </div>
            <div>
              <p className="text-muted text-sm mb-2">Confidence Level</p>
              <p className={`text-3xl font-bold ${getConfidenceColor(salesPrediction.confidence)}`}>
                {salesPrediction.confidence}
              </p>
            </div>
            <div>
              <p className="text-muted text-sm mb-2">Trend</p>
              <p className="text-3xl font-bold">
                {getTrendIcon(salesPrediction.trend)} {salesPrediction.trend}
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-cream-light rounded-2xl">
            <p className="text-sm text-terra-dark">
              💡 <strong>Insight:</strong>{' '}
              {salesPrediction.trend === 'UP' && 'Penjualan meningkat! Pastikan stock mencukupi.'}
              {salesPrediction.trend === 'DOWN' && 'Penjualan menurun. Pertimbangkan promosi atau diskon.'}
              {salesPrediction.trend === 'STABLE' && 'Penjualan stabil. Pertahankan strategi saat ini.'}
            </p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="card-warm mb-8">
          <div className="p-6 border-b border-cream-dark/40">
            <h2 className="text-xl font-bold font-display">⚠️ Low Stock Alerts</h2>
          </div>
          {lowStockAlerts.length === 0 ? (
            <div className="p-6 text-center text-muted">
              ✅ Semua produk stock aman
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-cream-light">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">
                      Threshold
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-dark">
                  {lowStockAlerts.map((alert, index) => (
                    <tr key={index} className="hover:bg-cream-light">
                      <td className="px-6 py-4">
                        <span className="font-medium text-charcoal">{alert.product}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-red-600 font-semibold">{alert.currentStock} unit</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-muted">{alert.threshold} unit</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                          LOW STOCK
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Auto Reorder Suggestions */}
        <div id="reorder-suggestions" className="card-warm">
          <div className="p-6 border-b border-cream-dark/40">
            <h2 className="text-xl font-bold font-display">🔄 Auto Reorder Suggestions</h2>
          </div>
          {reorderSuggestions.length === 0 ? (
            <div className="p-6 text-center text-muted">
              ✅ Tidak ada reorder yang diperlukan saat ini
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-cream-light">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">
                      Suggested Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">
                      Estimated Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-dark">
                  {reorderSuggestions.map((suggestion, index) => (
                    <tr key={index} className="hover:bg-cream-light">
                      <td className="px-6 py-4">
                        <span className="font-medium text-charcoal">{suggestion.product}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-red-600">{suggestion.currentStock} unit</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-forest font-semibold">{suggestion.suggestedOrder} unit</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-charcoal">
                          {formatCurrency(suggestion.estimatedCost)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted">{suggestion.reason}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="bg-forest text-white px-3 py-1 rounded-2xl text-sm font-medium hover:bg-forest-dark transition">
                          Order Now
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AutomationPage() {
  return (
    <ProtectedRoute>
      <AutomationContent />
    </ProtectedRoute>
  )
}
