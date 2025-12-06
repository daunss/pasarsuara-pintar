'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface WhatsAppStatus {
  connected: boolean
  phoneNumber?: string
  lastSeen?: string
  error?: string
}

export function WhatsAppStatusBadge() {
  const [status, setStatus] = useState<WhatsAppStatus>({ connected: false })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkStatus()
    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      } else {
        setStatus({ connected: false, error: 'Failed to check status' })
      }
    } catch (error) {
      setStatus({ connected: false, error: 'Connection error' })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
        <span className="text-gray-600">Checking...</span>
      </div>
    )
  }

  if (status.connected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-full text-sm">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-green-700 font-medium">WhatsApp Connected</span>
        {status.phoneNumber && (
          <span className="text-green-600 text-xs">({status.phoneNumber})</span>
        )}
      </div>
    )
  }

  return (
    <Link href="/setup-whatsapp">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 rounded-full text-sm hover:bg-red-200 transition cursor-pointer">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="text-red-700 font-medium">WhatsApp Disconnected</span>
        <span className="text-red-600 text-xs">→ Setup</span>
      </div>
    </Link>
  )
}
