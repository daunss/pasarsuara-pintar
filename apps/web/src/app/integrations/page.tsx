'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import IntegrationsDashboard from '@/components/integrations/IntegrationsDashboard'
import { Skeleton } from '@/components/ui/skeleton'

function IntegrationsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-6">
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }
      
      setUserId(user.id)
      setLoading(false)
    }
    
    checkUser()
  }, [router])

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <IntegrationsLoading />
      </div>
    )
  }

  if (!userId) {
    return null
  }

  return (
    <div className="container mx-auto py-6">
      <IntegrationsDashboard userID={userId} />
    </div>
  )
}
