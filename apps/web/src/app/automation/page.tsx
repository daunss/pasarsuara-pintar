'use client'

import { useEffect, useState } from 'react'
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

  const getConfidenceColor = (confidence: string) => {
    if (confidence === 'HIGH') return 'text-green-600'
    if (confidence === 'MEDIUM') return 'text-yellow-600'
    return 'text-red-600'
  }

  const getNotificationColor = (type: string) => {
    if (type === 'INFO') return 'bg-blue-50 border-blue-200 text-blue-800'
    if (type === 'WARNING') return 'bg-yellow-50 border-yellow-200 text-yellow-800'
    return 'bg-red-50 border-red-200 text-red-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat automation data...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">🤖 Smart Automation</h1>
              <p className="text-gray-600">AI-powered business automation & insights</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="bg-white border-2 border-green-600 text-green-600 px-4 py-2 rounded-lg font-semibold hover:bg-green-50 transition"
              >
                ← Dashboard
              </Link>
              <button
                onClick={loadAutomationData}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Smart Notifications */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">🔔 Smart Notifications</h2>
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
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
                      <button className="ml-4 px-3 py-1 bg-white rounded-lg text-sm font-medium hover:bg-gray-50 transition">
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
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">📊 Sales Prediction (7 Days)</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-600 text-sm mb-2">Predicted Revenue</p>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(salesPrediction.prediction)}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-2">Confidence Level</p>
              <p className={`text-3xl font-bold ${getConfidenceColor(salesPrediction.confidence)}`}>
                {salesPrediction.confidence}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-2">Trend</p>
              <p className="text-3xl font-bold">
                {getTrendIcon(salesPrediction.trend)} {salesPrediction.trend}
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Insight:</strong>{' '}
              {salesPrediction.trend === 'UP' && 'Penjualan meningkat! Pastikan stock mencukupi.'}
              {salesPrediction.trend === 'DOWN' && 'Penjualan menurun. Pertimbangkan promosi atau diskon.'}
              {salesPrediction.trend === 'STABLE' && 'Penjualan stabil. Pertahankan strategi saat ini.'}
            </p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">⚠️ Low Stock Alerts</h2>
          </div>
          {lowStockAlerts.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              ✅ Semua produk stock aman
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Threshold
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lowStockAlerts.map((alert, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">{alert.product}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-red-600 font-semibold">{alert.currentStock} unit</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600">{alert.threshold} unit</span>
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
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">🔄 Auto Reorder Suggestions</h2>
          </div>
          {reorderSuggestions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              ✅ Tidak ada reorder yang diperlukan saat ini
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Suggested Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estimated Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reorderSuggestions.map((suggestion, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">{suggestion.product}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-red-600">{suggestion.currentStock} unit</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-green-600 font-semibold">{suggestion.suggestedOrder} unit</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(suggestion.estimatedCost)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{suggestion.reason}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-green-700 transition">
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
