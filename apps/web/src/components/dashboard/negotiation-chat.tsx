'use client'

import { NegotiationLog } from '@/lib/supabase'
import { ShoppingCart, Store, Cpu, ArrowRight } from 'lucide-react'

interface NegotiationChatProps {
  negotiation: NegotiationLog
}

type Message = {
  role: string
  content: string
  time?: string
}

export function NegotiationChat({ negotiation }: NegotiationChatProps) {
  const messages: Message[] = Array.isArray(negotiation.transcript)
    ? negotiation.transcript
    : (negotiation.transcript?.messages || [])

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'Rp 0'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusStyle = (status: string | null) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-green-100 text-green-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      case 'EXPIRED':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'buyer_agent':
        return 'bg-blue-500 text-white ml-auto'
      case 'seller_agent':
        return 'bg-gray-200 text-gray-800'
      case 'system':
        return 'bg-green-100 text-green-800 mx-auto text-center'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'buyer_agent':
        return (
          <span className="inline-flex items-center gap-1">
            <ShoppingCart size={13} className="inline" /> Buyer Agent
          </span>
        )
      case 'seller_agent':
        return (
          <span className="inline-flex items-center gap-1">
            <Store size={13} className="inline" /> Seller Agent
          </span>
        )
      case 'system':
        return (
          <span className="inline-flex items-center gap-1">
            <Cpu size={13} className="inline" /> System
          </span>
        )
      default:
        return role
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{negotiation.product_name}</h3>
            <p className="text-sm text-gray-500 flex items-center gap-1 flex-wrap">
              Penawaran awal: {formatCurrency(negotiation.initial_offer)}
              {negotiation.final_price && (
                <>
                  <ArrowRight size={13} className="text-gray-400" /> Final: {formatCurrency(negotiation.final_price)}
                </>
              )}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(negotiation.status)}`}>
            {negotiation.status}
          </span>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto bg-white">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500 py-4">Tidak ada log percakapan</p>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'buyer_agent' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-4 py-2 ${getRoleStyle(msg.role)}`}>
                <p className="text-xs opacity-75 mb-1">{getRoleLabel(msg.role)}</p>
                <p className="text-sm">{msg.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
