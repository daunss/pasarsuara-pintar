import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing service role configuration' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ products: [] })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: products, error } = await supabaseAdmin
      .from('product_catalog')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('product_name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ products: products || [] })
  } catch (error: any) {
    console.error('Error in catalog API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
