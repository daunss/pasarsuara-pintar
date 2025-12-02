import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Lazy initialize Supabase to avoid build-time errors
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const body = await request.json()
    
    // Verify signature
    const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
    const signatureKey = body.signature_key
    const orderId = body.order_id
    const statusCode = body.status_code
    const grossAmount = body.gross_amount
    
    const hash = crypto
      .createHash('sha512')
      .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
      .digest('hex')
    
    if (hash !== signatureKey) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    // Update order status based on transaction status
    const transactionStatus = body.transaction_status
    let orderStatus = 'PENDING'

    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      orderStatus = 'CONFIRMED'
    } else if (transactionStatus === 'pending') {
      orderStatus = 'PENDING'
    } else if (transactionStatus === 'deny' || transactionStatus === 'expire' || transactionStatus === 'cancel') {
      orderStatus = 'CANCELLED'
    }

    // Update order in database
    const { error: orderError } = await supabase
      .from('orders')
      .update({ status: orderStatus })
      .eq('order_number', orderId)

    if (orderError) throw orderError

    // Update payment record
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', orderId)
      .single()

    if (orders) {
      // Find payment record for this order's transaction
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', body.custom_field1) // Store user_id in custom_field1
        .limit(1)

      if (transactions && transactions.length > 0) {
        await supabase
          .from('payments')
          .update({
            status: orderStatus === 'CONFIRMED' ? 'PAID' : orderStatus === 'CANCELLED' ? 'FAILED' : 'PENDING',
            reference_number: body.transaction_id,
            paid_at: orderStatus === 'CONFIRMED' ? new Date().toISOString() : null
          })
          .eq('transaction_id', transactions[0].id)
      }
    }

    // Add to order status history
    if (orders) {
      await supabase
        .from('order_status_history')
        .insert([{
          order_id: orders.id,
          status: orderStatus,
          notes: `Payment ${transactionStatus}`
        }])
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Payment notification error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
