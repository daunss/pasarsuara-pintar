import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const waGatewayUrl = process.env.WA_GATEWAY_URL || 'http://localhost:3002'
    
    const response = await fetch(`${waGatewayUrl}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { connected: false, error: 'Gateway not responding' },
        { status: 200 }
      )
    }

    const data = await response.json()
    
    return NextResponse.json({
      connected: data.connected || false,
      phoneNumber: data.phone_number,
      lastSeen: data.last_seen,
    })
  } catch (error) {
    console.error('Error checking WhatsApp status:', error)
    return NextResponse.json(
      { connected: false, error: 'Connection failed' },
      { status: 200 }
    )
  }
}
