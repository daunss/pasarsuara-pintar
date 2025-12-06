import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get pending reconciliations
    const { data, error } = await supabase
      .rpc('get_pending_reconciliations', { p_user_id: user.id })

    if (error) throw error

    return NextResponse.json({ pending: data })
  } catch (error: any) {
    console.error('Error fetching pending reconciliations:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reconciliation_id, received_amount, notes } = await request.json()

    // Update reconciliation
    const { data: reconciliation, error: fetchError } = await supabase
      .from('payment_reconciliations')
      .select('*, transactions!inner(*)')
      .eq('id', reconciliation_id)
      .single()

    if (fetchError) throw fetchError

    // Check if user owns this transaction
    if (reconciliation.transactions.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Determine status
    const status = received_amount === reconciliation.expected_amount ? 'matched' : 'mismatch'

    // Update reconciliation
    const { error: updateError } = await supabase
      .from('payment_reconciliations')
      .update({
        received_amount,
        status,
        reconciled_at: new Date().toISOString(),
        reconciled_by: user.id,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reconciliation_id)

    if (updateError) throw updateError

    // If matched, update transaction payment status
    if (status === 'matched') {
      await supabase
        .from('transactions')
        .update({ payment_status: 'PAID' })
        .eq('id', reconciliation.transaction_id)
    }

    return NextResponse.json({ success: true, status })
  } catch (error: any) {
    console.error('Error reconciling payment:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
