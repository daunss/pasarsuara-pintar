'use client'

import { useEffect, useState } from 'react'
import { AppError } from '@/lib/error-handler'

interface ErrorToastProps {
  error: AppError | null
  onClose: () => void
}

export function ErrorToast({ error, onClose }: ErrorToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (error) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        setTimeout(onClose, 300) // Wait for fade out animation
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, onClose])

  if (!error) return null

  const getIcon = () => {
    switch (error.type) {
      case 'NETWORK':
        return '📡'
      case 'AUTH':
        return '🔐'
      case 'VALIDATION':
        return '⚠️'
      case 'WHATSAPP':
        return '📱'
      case 'PAYMENT':
        return '💳'
      case 'DATABASE':
        return '💾'
      default:
        return '❌'
    }
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-md transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className="bg-red-50 border-l-4 border-red-500 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{getIcon()}</span>
          <div className="flex-1">
            <h4 className="font-semibold text-red-800 mb-1">
              {error.type} Error
            </h4>
            <p className="text-sm text-red-700">{error.userMessage}</p>
            {process.env.NODE_ENV === 'development' && error.message && (
              <p className="text-xs text-red-600 mt-2 font-mono">
                {error.message}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              setVisible(false)
              setTimeout(onClose, 300)
            }}
            className="text-red-400 hover:text-red-600 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// Success Toast
interface SuccessToastProps {
  message: string
  onClose: () => void
}

export function SuccessToast({ message, onClose }: SuccessToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-md transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className="bg-green-50 border-l-4 border-green-500 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">✅</span>
          <div className="flex-1">
            <p className="text-sm text-green-700 font-medium">{message}</p>
          </div>
          <button
            onClick={() => {
              setVisible(false)
              setTimeout(onClose, 300)
            }}
            className="text-green-400 hover:text-green-600 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
