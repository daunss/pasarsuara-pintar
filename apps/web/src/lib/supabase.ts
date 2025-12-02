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

// Phase 3 Types
export type ProductCatalog = {
  id: string
  user_id: string
  product_name: string
  category: string | null
  description: string | null
  default_price: number | null
  default_unit: string | null
  image_url: string | null
  sku: string | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

export type Contact = {
  id: string
  user_id: string
  type: 'SUPPLIER' | 'CUSTOMER'
  name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  notes: string | null
  rating: number | null
  total_transactions: number | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

export type Payment = {
  id: string
  transaction_id: string
  amount: number
  payment_method: 'CASH' | 'TRANSFER' | 'CREDIT' | 'DEBIT' | 'EWALLET' | null
  status: 'PAID' | 'PENDING' | 'PARTIAL' | 'FAILED' | 'REFUNDED'
  reference_number: string | null
  notes: string | null
  paid_at: string | null
  created_at: string | null
  updated_at: string | null
}

export type AuditLog = {
  id: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  old_data: any
  new_data: any
  ip_address: string | null
  user_agent: string | null
  created_at: string | null
}

export type UserPreferences = {
  id: string
  user_id: string
  language: string | null
  currency: string | null
  timezone: string | null
  notification_enabled: boolean
  notification_channels: string[] | null
  low_stock_threshold: number | null
  report_frequency: string | null
  theme: string | null
  created_at: string | null
  updated_at: string | null
}

export type NotificationQueue = {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  channel: 'whatsapp' | 'email' | 'push'
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED'
  scheduled_at: string | null
  sent_at: string | null
  error_message: string | null
  retry_count: number | null
  created_at: string | null
}
