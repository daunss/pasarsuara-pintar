import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const { origin, destination, weight = 1 } = body

    // Get available delivery providers
    const { data: providers, error: providersError } = await supabase
      .from('delivery_providers')
      .select('*')
      .eq('is_active', true)
      .order('base_rate', { ascending: true })

    if (providersError) throw providersError

    // Calculate shipping cost for each provider
    const shippingOptions = await Promise.all(
      providers.map(async (provider) => {
        // For self pickup, cost is 0
        if (provider.code === 'self_pickup') {
          return {
            provider_id: provider.id,
            provider_name: provider.name,
            provider_code: provider.code,
            cost: 0,
            estimated_days: 0,
            description: provider.description
          }
        }

        // Try to get specific rate for origin-destination
        const { data: rate } = await supabase
          .from('shipping_rates')
          .select('*')
          .eq('provider_id', provider.id)
          .eq('origin_city', origin)
          .eq('destination_city', destination)
          .eq('is_active', true)
          .single()

        if (rate) {
          return {
            provider_id: provider.id,
            provider_name: provider.name,
            provider_code: provider.code,
            cost: parseFloat(rate.rate.toString()),
            estimated_days: rate.estimated_days,
            description: provider.description
          }
        }

        // Fallback to base rate calculation
        const baseCost = parseFloat(provider.base_rate.toString())
        const weightCost = weight * parseFloat(provider.per_km_rate.toString())
        const totalCost = baseCost + weightCost

        return {
          provider_id: provider.id,
          provider_name: provider.name,
          provider_code: provider.code,
          cost: totalCost,
          estimated_days: Math.ceil(provider.estimated_hours / 24),
          description: provider.description
        }
      })
    )

    return NextResponse.json({
      success: true,
      options: shippingOptions.sort((a, b) => a.cost - b.cost)
    })
  } catch (error: any) {
    console.error('Shipping calculation error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
