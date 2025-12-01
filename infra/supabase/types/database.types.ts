export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      inventory: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          max_buy_price: number | null
          min_sell_price: number | null
          product_name: string
          stock_qty: number | null
          unit: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          max_buy_price?: number | null
          min_sell_price?: number | null
          product_name: string
          stock_qty?: number | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          max_buy_price?: number | null
          min_sell_price?: number | null
          product_name?: string
          stock_qty?: number | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiation_logs: {
        Row: {
          buyer_id: string | null
          completed_at: string | null
          created_at: string | null
          final_price: number | null
          id: string
          initial_offer: number | null
          product_name: string | null
          seller_id: string | null
          status: string | null
          transcript: Json | null
        }
        Insert: {
          buyer_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          final_price?: number | null
          id?: string
          initial_offer?: number | null
          product_name?: string | null
          seller_id?: string | null
          status?: string | null
          transcript?: Json | null
        }
        Update: {
          buyer_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          final_price?: number | null
          id?: string
          initial_offer?: number | null
          product_name?: string | null
          seller_id?: string | null
          status?: string | null
          transcript?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_logs_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_logs_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          created_at: string | null
          id: string
          price_per_unit: number | null
          product_name: string | null
          qty: number | null
          raw_voice_text: string | null
          total_amount: number | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          price_per_unit?: number | null
          product_name?: string | null
          qty?: number | null
          raw_voice_text?: string | null
          total_amount?: number | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          price_per_unit?: number | null
          product_name?: string | null
          qty?: number | null
          raw_voice_text?: string | null
          total_amount?: number | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          location: unknown
          name: string | null
          phone_number: string | null
          preferred_dialect: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          location?: unknown
          name?: string | null
          phone_number?: string | null
          preferred_dialect?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          location?: unknown
          name?: string | null
          phone_number?: string | null
          preferred_dialect?: string | null
          role?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Specific table types
export type User = Tables<'users'>
export type Inventory = Tables<'inventory'>
export type Transaction = Tables<'transactions'>
export type NegotiationLog = Tables<'negotiation_logs'>

// Insert types
export type UserInsert = InsertTables<'users'>
export type InventoryInsert = InsertTables<'inventory'>
export type TransactionInsert = InsertTables<'transactions'>
export type NegotiationLogInsert = InsertTables<'negotiation_logs'>

// Negotiation transcript type
export type NegotiationMessage = {
  role: 'buyer_agent' | 'seller_agent' | 'system'
  content: string
}

export type NegotiationTranscript = {
  messages: NegotiationMessage[]
}
