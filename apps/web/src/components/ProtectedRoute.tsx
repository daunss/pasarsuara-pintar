'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireRole?: string[]
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  console.log('ProtectedRoute render:', { loading, hasUser: !!user, pathname })

  useEffect(() => {
    console.log('ProtectedRoute useEffect:', { loading, hasUser: !!user })
    if (!loading && !user) {
      console.log('Redirecting to login')
      // Save the attempted URL to redirect back after login
      sessionStorage.setItem('redirectAfterLogin', pathname)
      router.push('/login')
    }
  }, [user, loading, router, pathname])

  // Check role if specified
  useEffect(() => {
    if (!loading && user && requireRole) {
      const userRole = user.user_metadata?.role || 'umkm'
      if (!requireRole.includes(userRole)) {
        router.push('/unauthorized')
      }
    }
  }, [user, loading, requireRole, router])

  if (loading) {
    console.log('ProtectedRoute: Showing loading state')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Memuat...</p>
          <p className="text-gray-400 text-sm mt-2">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    console.log('ProtectedRoute: No user, returning null')
    return null
  }

  console.log('ProtectedRoute: Rendering children')
  return <>{children}</>
}
