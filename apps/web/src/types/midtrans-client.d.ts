declare module 'midtrans-client' {
  export interface MidtransConfig {
    isProduction: boolean
    serverKey: string
    clientKey: string
  }

  export interface TransactionDetails {
    order_id: string
    gross_amount: number
  }

  export interface CustomerDetails {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
  }

  export interface ItemDetail {
    id: string
    name: string
    price: number
    quantity: number
  }

  export interface Callbacks {
    finish?: string
    error?: string
    pending?: string
  }

  export interface TransactionParameter {
    transaction_details: TransactionDetails
    customer_details?: CustomerDetails
    item_details?: ItemDetail[]
    callbacks?: Callbacks
    enabled_payments?: string[]
    credit_card?: {
      secure?: boolean
      bank?: string
      installment?: any
    }
  }

  export interface TransactionResponse {
    token: string
    redirect_url: string
  }

  export interface TransactionStatus {
    status_code: string
    status_message: string
    transaction_id: string
    order_id: string
    gross_amount: string
    payment_type: string
    transaction_time: string
    transaction_status: string
    fraud_status?: string
    signature_key: string
  }

  export class Snap {
    constructor(config: MidtransConfig)
    createTransaction(parameter: TransactionParameter): Promise<TransactionResponse>
  }

  export class CoreApi {
    constructor(config: MidtransConfig)
    transaction: {
      status(orderId: string): Promise<TransactionStatus>
      cancel(orderId: string): Promise<any>
      approve(orderId: string): Promise<any>
      refund(orderId: string, parameter?: any): Promise<any>
    }
  }

  const midtransClient: {
    Snap: typeof Snap
    CoreApi: typeof CoreApi
  }

  export default midtransClient
}
