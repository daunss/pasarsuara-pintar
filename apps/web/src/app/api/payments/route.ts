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
      return NextResponse.json({ payments: [] })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Get transactions for this user
    const { data: txs, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('user_id', userId)

    if (txError) throw txError
    const txIds = txs?.map(t => t.id) || []

    if (txIds.length === 0) {
      return NextResponse.json({ payments: [] })
    }

    // Get payments for those transactions
    const { data: payments, error: payError } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        transaction:transactions(*)
      `)
      .in('transaction_id', txIds)
      .order('created_at', { ascending: false })

    if (payError) throw payError

    return NextResponse.json({ payments: payments || [] })
  } catch (error: any) {
    console.error('Error in payments API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
