'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase, type UserPreferences } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Link from 'next/link'

function SettingsPageContent() {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [formData, setFormData] = useState({
    language: 'id',
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
    notification_enabled: true,
    low_stock_threshold: 10,
    report_frequency: 'daily',
    theme: 'light'
  })

  useEffect(() => {
    if (user) {
      fetchPreferences()
    }
  }, [user])

  const fetchPreferences = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      if (data) {
        setPreferences(data)
        setFormData({
          language: data.language || 'id',
          currency: data.currency || 'IDR',
          timezone: data.timezone || 'Asia/Jakarta',
          notification_enabled: data.notification_enabled,
          low_stock_threshold: data.low_stock_threshold || 10,
          report_frequency: data.report_frequency || 'daily',
          theme: data.theme || 'light'
        })
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({
          language: formData.language,
          currency: formData.currency,
          timezone: formData.timezone,
          notification_enabled: formData.notification_enabled,
          low_stock_threshold: formData.low_stock_threshold,
          report_frequency: formData.report_frequency,
          theme: formData.theme,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (error) throw error

      alert('Pengaturan berhasil disimpan!')
    } catch (error) {
      console.error('Error saving preferences:', error)
      alert('Gagal menyimpan pengaturan')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    if (confirm('Yakin ingin keluar?')) {
      await signOut()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-2xl font-bold text-green-700">
                🗣️ PasarSuara
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">Pengaturan</span>
            </div>
            <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
              ← Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">⚙️ Pengaturan</h1>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat pengaturan...</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Profil</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl">👤</span>
                  </div>
                  <h3 className="font-semibold text-lg">{user?.user_metadata?.name || 'User'}</h3>
                  <p className="text-sm text-gray-600">{user?.email}</p>
                  <p className="text-xs text-gray-500 mt-1">{user?.user_metadata?.business_type}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kota:</span>
                    <span className="font-medium">{user?.user_metadata?.city || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">WhatsApp:</span>
                    <span className="font-medium">{user?.user_metadata?.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bergabung:</span>
                    <span className="font-medium">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString('id-ID') : '-'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full mt-6 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
                >
                  Keluar
                </button>
              </CardContent>
            </Card>

            {/* Settings Form */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Preferensi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Language */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Bahasa</label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="id">Bahasa Indonesia</option>
                      <option value="jv">Bahasa Jawa</option>
                      <option value="su">Bahasa Sunda</option>
                    </select>
                  </div>

                  {/* Currency */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Mata Uang</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="IDR">Rupiah (IDR)</option>
                      <option value="USD">US Dollar (USD)</option>
                    </select>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Zona Waktu</label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="Asia/Jakarta">WIB (Jakarta)</option>
                      <option value="Asia/Makassar">WITA (Makassar)</option>
                      <option value="Asia/Jayapura">WIT (Jayapura)</option>
                    </select>
                  </div>

                  {/* Notifications */}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.notification_enabled}
                        onChange={(e) => setFormData({ ...formData, notification_enabled: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium">Aktifkan Notifikasi</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      Terima notifikasi stok menipis dan laporan harian via WhatsApp
                    </p>
                  </div>

                  {/* Low Stock Threshold */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Batas Stok Menipis
                    </label>
                    <input
                      type="number"
                      value={formData.low_stock_threshold}
                      onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg"
                      min="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Notifikasi akan dikirim jika stok di bawah angka ini
                    </p>
                  </div>

                  {/* Report Frequency */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Frekuensi Laporan</label>
                    <select
                      value={formData.report_frequency}
                      onChange={(e) => setFormData({ ...formData, report_frequency: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="daily">Harian</option>
                      <option value="weekly">Mingguan</option>
                      <option value="monthly">Bulanan</option>
                      <option value="never">Tidak Pernah</option>
                    </select>
                  </div>

                  {/* Theme */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Tema</label>
                    <select
                      value={formData.theme}
                      onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="light">Terang</option>
                      <option value="dark">Gelap</option>
                      <option value="auto">Otomatis</option>
                    </select>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsPageContent />
    </ProtectedRoute>
  )
}
