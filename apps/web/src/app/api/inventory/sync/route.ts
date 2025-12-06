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

    // Get unsynced inventory
    const { data, error } = await supabase
      .rpc('get_unsynced_inventory', { p_user_id: user.id })

    if (error) throw error

    return NextResponse.json({ unsynced: data })
  } catch (error: any) {
    console.error('Error fetching unsynced inventory:', error)
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

    const { inventory_id } = await request.json()

    // Sync inventory to marketplace
    const { data, error } = await supabase
      .rpc('sync_inventory_to_marketplace', { p_inventory_id: inventory_id })

    if (error) throw error

    return NextResponse.json({ result: data })
  } catch (error: any) {
    console.error('Error syncing inventory:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
