'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { WhatsAppStatusBadge } from './whatsapp-status'
import { SyncStatusBadge } from './sync-status'
import { NotificationCenter } from './notification-center'

interface DashboardHeaderProps {
  userEmail?: string
}

export function DashboardHeader({ userEmail }: DashboardHeaderProps) {
  const router = useRouter()

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl font-bold text-green-700">
              🗣️ PasarSuara
            </Link>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            {/* WhatsApp Status */}
            <WhatsAppStatusBadge />
            
            {/* Sync Status */}
            <SyncStatusBadge />
            
            {/* Notifications */}
            <NotificationCenter />
            
            {/* Profile Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 text-sm text-gray-700 hover:text-green-600 transition">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-semibold">
                    {userEmail?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden md:block">{userEmail}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">{userEmail}</p>
                  <p className="text-xs text-gray-500 mt-1">UMKM User</p>
                </div>
                
                <div className="py-2">
                  <Link
                    href="/demo"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition bg-gradient-to-r from-green-50 to-blue-50"
                  >
                    <span className="text-lg">🎯</span>
                    <div>
                      <p className="font-medium">Hackathon Demo</p>
                      <p className="text-xs text-gray-500">Voice & AI Negotiation</p>
                    </div>
                  </Link>
                  
                  <Link
                    href="/setup-whatsapp"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition"
                  >
                    <span className="text-lg">📱</span>
                    <div>
                      <p className="font-medium">Setup WhatsApp</p>
                      <p className="text-xs text-gray-500">Tambah/ubah nomor WA</p>
                    </div>
                  </Link>
                  
                  <Link
                    href="/dashboard/customers"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition"
                  >
                    <span className="text-lg">👥</span>
                    <div>
                      <p className="font-medium">Pelanggan</p>
                      <p className="text-xs text-gray-500">Manajemen pelanggan</p>
                    </div>
                  </Link>
                  
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition"
                  >
                    <span className="text-lg">⚙️</span>
                    <div>
                      <p className="font-medium">Pengaturan</p>
                      <p className="text-xs text-gray-500">Preferensi akun</p>
                    </div>
                  </Link>
                  
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut()
                      router.push('/login')
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <span className="text-lg">🚪</span>
                    <div className="text-left">
                      <p className="font-medium">Logout</p>
                      <p className="text-xs text-red-500">Keluar dari akun</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
