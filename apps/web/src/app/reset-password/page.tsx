'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`
      })

      if (error) throw error

      setSuccess(true)
    } catch (error: any) {
      setError(error.message || 'Gagal mengirim email reset password')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="page-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full card-warm p-8 text-center">
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-2xl font-bold font-display text-charcoal mb-2">
            Email Terkirim!
          </h2>
          <p className="text-muted mb-6">
            Kami telah mengirim link reset password ke <strong>{email}</strong>
          </p>
          <p className="text-sm text-muted mb-6">
            Silakan cek inbox atau folder spam Anda.
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
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-3xl font-bold font-display text-charcoal mb-2">
            Reset Password
          </h1>
          <p className="text-muted">
            Masukkan email Anda untuk reset password
          </p>
        </div>

        {/* Reset Card */}
        <div className="card-warm p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-warm"
                placeholder="nama@email.com"
                disabled={loading}
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

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-terra hover:text-terra-dark"
            >
              ← Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
