import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.exchangeCodeForSession(code)

    // Check if user has phone number (for Google OAuth users)
    const { data: userData } = await supabase.auth.getUser()
    const userMetadata = userData.user?.user_metadata
    
    // If user logged in with Google and doesn't have phone, redirect to setup
    if (userData.user?.app_metadata?.provider === 'google' && !userMetadata?.phone) {
      return NextResponse.redirect(new URL('/setup-whatsapp', request.url))
    }
  }

  // Redirect to dashboard after successful auth
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
