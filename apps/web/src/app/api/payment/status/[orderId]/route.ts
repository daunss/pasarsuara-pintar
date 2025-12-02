import { NextRequest, NextResponse } from 'next/server'
import midtransClient from 'midtrans-client'

// Function to get Midtrans Core API client (lazy initialization)
function getCoreClient() {
  return new midtransClient.CoreApi({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY || '',
    clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ''
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params

    // Get transaction status from Midtrans
    const core = getCoreClient()
    const statusResponse = await core.transaction.status(orderId)

    return NextResponse.json({
      success: true,
      data: statusResponse
    })
  } catch (error: any) {
    console.error('Error checking payment status:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
