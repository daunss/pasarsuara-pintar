'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function SetupWhatsAppPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phone, setPhone] = useState('')
  const [hasPhone, setHasPhone] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    // Check if user already has phone number
    checkExistingPhone()
  }, [user, router])

  const checkExistingPhone = async () => {
    try {
      // Check from user metadata
      const { data: userData } = await supabase.auth.getUser()
      const userPhone = userData.user?.user_metadata?.phone

      if (userPhone) {
        setHasPhone(true)
        setPhone(userPhone)
      }
    } catch (error) {
      console.error('Error checking phone:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate phone number
    if (!phone || phone.length < 10) {
      setError('Nomor WhatsApp tidak valid. Minimal 10 digit.')
      setLoading(false)
      return
    }

    // Format phone number (remove spaces, dashes, etc)
    const cleanPhone = phone.replace(/[^0-9]/g, '')

    // Ensure starts with 62 or 08
    let formattedPhone = cleanPhone
    if (cleanPhone.startsWith('0')) {
      formattedPhone = '62' + cleanPhone.substring(1)
    } else if (!cleanPhone.startsWith('62')) {
      formattedPhone = '62' + cleanPhone
    }

    try {
      // Update user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { phone: formattedPhone }
      })

      if (authError) throw authError

      // Also upsert into public.users so WA bot can find this user
      if (user) {
        const { data: userData } = await supabase.auth.getUser()
        await supabase.from('users').upsert({
          id: user.id,
          email: userData.user?.email || '',
          phone_number: formattedPhone,
          name: userData.user?.user_metadata?.business_name || userData.user?.user_metadata?.full_name || '',
          role: 'umkm'
        }, { onConflict: 'id' })
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Error saving phone:', error)
      const msg = error?.message || ''
      if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('23505')) {
        setError('Nomor WhatsApp ini sudah terdaftar di akun lain. Gunakan nomor yang berbeda.')
      } else {
        setError(msg || 'Gagal menyimpan nomor WhatsApp')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    router.push('/dashboard')
  }

  if (hasPhone) {
    return (
      <div className="page-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full card-warm p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold font-display text-charcoal mb-4">
            Nomor WhatsApp Sudah Terdaftar
          </h2>
          <p className="text-muted mb-6">
            Nomor WhatsApp Anda: <strong>{phone}</strong>
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="btn-primary w-full"
          >
            Lanjut ke Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📱</div>
          <h1 className="text-3xl font-bold font-display text-charcoal mb-2">
            Setup WhatsApp
          </h1>
          <p className="text-muted">
            Tambahkan nomor WhatsApp untuk menggunakan fitur voice recording
          </p>
        </div>

        {/* Setup Card */}
        <div className="card-warm p-8">
          <h2 className="text-xl font-bold font-display text-charcoal mb-6">
            Nomor WhatsApp Anda
          </h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Kenapa perlu WhatsApp?</strong>
              <br />
              Anda bisa catat transaksi dengan voice note via WhatsApp. Lebih cepat dan mudah!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                Nomor WhatsApp
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08123456789 atau 628123456789"
                className="input-warm"
                required
              />
              <p className="mt-2 text-xs text-muted">
                Format: 08xxx atau 628xxx (tanpa spasi atau tanda hubung)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Menyimpan...' : 'Simpan & Lanjutkan'}
            </button>

            <button
              type="button"
              onClick={handleSkip}
              className="w-full bg-white border-2 border-cream-dark text-charcoal py-3 rounded-2xl font-semibold hover:bg-cream-light transition"
            >
              Lewati (Nanti Saja)
            </button>
          </form>

          {/* Features */}
          <div className="mt-6 pt-6 border-t border-cream-dark/40">
            <p className="text-sm font-medium text-charcoal mb-3">
              Dengan WhatsApp, Anda bisa:
            </p>
            <ul className="space-y-2 text-sm text-muted">
              <li className="flex items-start gap-2">
                <span className="text-terra">✓</span>
                <span>Catat transaksi dengan voice note</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-terra">✓</span>
                <span>Terima notifikasi stock menipis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-terra">✓</span>
                <span>Laporan harian otomatis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-terra">✓</span>
                <span>Negosiasi dengan supplier</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Privacy Note */}
        <p className="mt-6 text-center text-xs text-muted">
          🔒 Nomor WhatsApp Anda aman dan tidak akan dibagikan ke pihak ketiga
        </p>
      </div>
    </div>
  )
}
