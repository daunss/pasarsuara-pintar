import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export type User = {
  id: string
  email: string | null
  phone_number: string | null
  name: string | null
  role: string | null
  preferred_dialect: string | null
  created_at: string | null
}

export type Inventory = {
  id: string
  user_id: string | null
  product_name: string
  stock_qty: number | null
  unit: string | null
  min_sell_price: number | null
  max_buy_price: number | null
  description: string | null
  created_at: string | null
}

export type Transaction = {
  id: string
  user_id: string | null
  type: 'SALE' | 'PURCHASE' | 'EXPENSE'
  product_name: string | null
  qty: number | null
  price_per_unit: number | null
  total_amount: number | null
  raw_voice_text: string | null
  created_at: string | null
}

export type NegotiationLog = {
  id: string
  buyer_id: string | null
  seller_id: string | null
  product_name: string | null
  initial_offer: number | null
  final_price: number | null
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | null
  transcript: any
  created_at: string | null
  completed_at: string | null
}
