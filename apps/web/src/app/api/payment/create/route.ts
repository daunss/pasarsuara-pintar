import { NextRequest, NextResponse } from 'next/server'
import midtransClient from 'midtrans-client'

// Initialize Midtrans Snap
const snap = new midtransClient.Snap({
  isProduction: false, // Set to true for production
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ''
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, amount, customerDetails, itemDetails } = body

    // Create transaction parameter
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      customer_details: customerDetails,
      item_details: itemDetails,
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}?status=success`,
        error: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}?status=error`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}?status=pending`
      }
    }

    // Create transaction
    const transaction = await snap.createTransaction(parameter)

    return NextResponse.json({
      success: true,
      token: transaction.token,
      redirect_url: transaction.redirect_url
    })
  } catch (error: any) {
    console.error('Midtrans error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
