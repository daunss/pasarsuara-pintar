'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface SyncStatus {
  unsyncedCount: number
  pendingReconciliations: number
}

export function SyncStatusBadge() {
  const [status, setStatus] = useState<SyncStatus>({ unsyncedCount: 0, pendingReconciliations: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkStatus()
    // Check every 60 seconds
    const interval = setInterval(checkStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  const checkStatus = async () => {
    try {
      const [inventoryRes, paymentsRes] = await Promise.all([
        fetch('/api/inventory/sync'),
        fetch('/api/payments/reconcile'),
      ])

      if (inventoryRes.ok && paymentsRes.ok) {
        const inventoryData = await inventoryRes.json()
        const paymentsData = await paymentsRes.json()

        setStatus({
          unsyncedCount: inventoryData.unsynced?.length || 0,
          pendingReconciliations: paymentsData.pending?.length || 0,
        })
      }
    } catch (error) {
      console.error('Error checking sync status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return null

  const totalIssues = status.unsyncedCount + status.pendingReconciliations

  if (totalIssues === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-full text-sm">
        <span className="text-green-700">✓ Semua tersinkron</span>
      </div>
    )
  }

  return (
    <Link href="/dashboard/sync">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 rounded-full text-sm hover:bg-yellow-200 transition cursor-pointer">
        <span className="text-yellow-700 font-medium">
          ⚠️ {totalIssues} perlu disinkron
        </span>
      </div>
    </Link>
  )
}
