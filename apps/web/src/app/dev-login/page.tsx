'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DevLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('test@pasarsuara.com')
  const [password, setPassword] = useState('password123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleQuickSignup = async () => {
    setLoading(true)
    setError('')
    setMessage('Creating account...')

    try {
      // Try to sign up with email confirmation disabled
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: 'Test User',
            business_name: 'Warung Test',
            business_type: 'Warung Makan'
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (signupError) {
        // If user exists, try to login
        if (signupError.message.includes('already registered') || signupError.message.includes('User already registered')) {
          setMessage('User exists, trying to login...')
          
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password
          })

          if (loginError) {
            // Try with different error messages
            setError(`Login failed: ${loginError.message}. Try creating a new account with different email.`)
            return
          }

          setMessage('✅ Login berhasil!')
          setTimeout(() => router.push('/dashboard'), 1000)
        } else {
          throw signupError
        }
      } else {
        // Check if email confirmation is required
        if (signupData.user && !signupData.session) {
          setMessage('⚠️ Email confirmation required. Check your email or contact admin to confirm your account.')
          setError('Note: For dev, you may need to disable email confirmation in Supabase Dashboard → Authentication → Settings')
        } else {
          setMessage('✅ Akun dibuat! Redirecting...')
          setTimeout(() => router.push('/dashboard'), 1000)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      setMessage('Login berhasil!')
      setTimeout(() => router.push('/dashboard'), 1000)
    } catch (err: any) {
      setError(err.message || 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-bg flex items-center justify-center p-4">
      <div className="card-warm p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-display text-terra-dark mb-2">
            🗣️ Suara Niaga
          </h1>
          <p className="text-muted">Dev Login - Quick Access</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-warm"
              placeholder="test@pasarsuara.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-warm"
              placeholder="password123"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 border border-green-200 text-terra-dark px-4 py-3 rounded-lg">
              {message}
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={handleQuickSignup}
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : '🚀 Quick Signup/Login'}
            </button>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-2xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : '🔑 Login Only'}
            </button>
          </div>

          <div className="text-center text-sm text-muted mt-4">
            <p>Default credentials:</p>
            <p className="font-mono bg-cream-dark p-2 rounded mt-2">
              test@pasarsuara.com / password123
            </p>
          </div>

          <div className="text-center mt-4">
            <a href="/login" className="text-terra hover:text-terra-dark text-sm">
              ← Back to normal login
            </a>
          </div>
        </div>

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            <strong>⚠️ Development Only</strong><br />
            This page is for quick testing. Remove in production!
          </p>
        </div>
      </div>
    </div>
  )
}
