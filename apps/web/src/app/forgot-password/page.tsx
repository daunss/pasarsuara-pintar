'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim email reset password')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="page-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full card-warm p-8 text-center">
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-2xl font-bold font-display text-charcoal mb-4">Email Terkirim!</h2>
          <p className="text-muted mb-6">
            Kami telah mengirim link reset password ke email Anda. Silakan cek inbox atau folder spam.
          </p>
          <Link
            href="/login"
            className="btn-primary inline-block px-6"
          >
            Kembali ke Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl sm:text-4xl font-bold font-display text-terra-dark mb-2">
              🗣️ Suara Niaga
            </h1>
          </Link>
          <p className="text-muted">Reset Password</p>
        </div>

        {/* Reset Card */}
        <div className="card-warm p-8">
          <h2 className="text-2xl font-bold font-display text-charcoal mb-2">Lupa Password?</h2>
          <p className="text-muted mb-6 text-sm">
            Masukkan email Anda dan kami akan mengirim link untuk reset password.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-warm"
                placeholder="nama@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>
          </form>

          {/* Back to Login */}
          <p className="mt-6 text-center text-sm text-muted">
            <Link href="/login" className="text-terra font-semibold transition">
              ← Kembali ke Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
