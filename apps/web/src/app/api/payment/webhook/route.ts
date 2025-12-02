import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Lazy initialize Supabase to avoid build-time errors
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const body = await request.json()
    
    // Verify signature from Midtrans
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      payment_type,
      transaction_time
    } = body

    // Verify signature
    const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
    const hash = crypto
      .createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest('hex')

    if (hash !== signature_key) {
      console.error('Invalid signature')
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Determine order status based on transaction status
    let orderStatus = 'PENDING'
    let paymentStatus = 'PENDING'

    if (transaction_status === 'capture') {
      if (fraud_status === 'accept') {
        orderStatus = 'CONFIRMED'
        paymentStatus = 'PAID'
      }
    } else if (transaction_status === 'settlement') {
      orderStatus = 'CONFIRMED'
      paymentStatus = 'PAID'
    } else if (transaction_status === 'cancel' || transaction_status === 'deny' || transaction_status === 'expire') {
      orderStatus = 'CANCELLED'
      paymentStatus = 'FAILED'
    } else if (transaction_status === 'pending') {
      orderStatus = 'PENDING'
      paymentStatus = 'PENDING'
    }

    // Update order status
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({
        status: orderStatus,
        payment_status: paymentStatus,
        payment_method: payment_type,
        paid_at: paymentStatus === 'PAID' ? new Date().toISOString() : null
      })
      .eq('order_number', order_id)
      .select()
      .single()

    if (orderError) {
      console.error('Error updating order:', orderError)
      throw orderError
    }

    // Create order status history
    await supabase
      .from('order_status_history')
      .insert([{
        order_id: order.id,
        status: orderStatus,
        notes: `Payment ${paymentStatus.toLowerCase()} via ${payment_type}`,
        created_by: order.buyer_id
      }])

    // Create payment record
    await supabase
      .from('payments')
      .insert([{
        user_id: order.buyer_id,
        order_id: order.id,
        amount: parseFloat(gross_amount),
        payment_method: payment_type,
        status: paymentStatus,
        transaction_id: body.transaction_id,
        payment_data: body
      }])

    console.log(`Payment webhook processed for order ${order_id}: ${paymentStatus}`)

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully'
    })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
