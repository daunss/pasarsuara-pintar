'use client'

import { useState, useEffect } from 'react'
import { useCart } from '@/lib/cart'
import { useAuth } from '@/lib/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'

function CheckoutContent() {
  const { user } = useAuth()
  const { items, getTotalAmount, clearCart } = useCart()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingShipping, setLoadingShipping] = useState(false)
  const [shippingOptions, setShippingOptions] = useState<any[]>([])
  const [selectedShipping, setSelectedShipping] = useState<any>(null)
  const [formData, setFormData] = useState({
    delivery_address: '',
    delivery_city: 'Jakarta',
    recipient_name: '',
    recipient_phone: '',
    delivery_notes: ''
  })

  useEffect(() => {
    if (formData.delivery_city) {
      fetchShippingOptions()
    }
  }, [formData.delivery_city])

  const fetchShippingOptions = async () => {
    setLoadingShipping(true)
    try {
      const response = await fetch('/api/shipping/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: 'Jakarta', // TODO: Get from seller location
          destination: formData.delivery_city,
          weight: 1 // TODO: Calculate from cart items
        })
      })

      const data = await response.json()
      if (data.success) {
        setShippingOptions(data.options)
        // Auto-select cheapest option
        if (data.options.length > 0) {
          setSelectedShipping(data.options[0])
        }
      }
    } catch (error) {
      console.error('Error fetching shipping:', error)
    } finally {
      setLoadingShipping(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || items.length === 0 || !selectedShipping) {
      alert('Mohon pilih metode pengiriman')
      return
    }

    setLoading(true)
    try {
      // Group items by seller
      const itemsBySeller = items.reduce((acc, item) => {
        if (!acc[item.sellerId]) {
          acc[item.sellerId] = []
        }
        acc[item.sellerId].push(item)
        return acc
      }, {} as Record<string, typeof items>)

      // Create orders for each seller
      const orderIds: string[] = []
      
      for (const [sellerId, sellerItems] of Object.entries(itemsBySeller)) {
        const subtotal = sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
        const deliveryFee = selectedShipping.cost
        const totalAmount = subtotal + deliveryFee

        // Generate order number
        const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`

        // Create order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert([{
            buyer_id: user.id,
            seller_id: sellerId,
            order_number: orderNumber,
            status: 'PENDING',
            payment_status: 'PENDING',
            subtotal: subtotal,
            delivery_fee: deliveryFee,
            total_amount: totalAmount,
            delivery_address: `${formData.delivery_address}, ${formData.delivery_city}`,
            delivery_notes: formData.delivery_notes
          }])
          .select()
          .single()

        if (orderError) throw orderError

        // Create delivery record
        await supabase
          .from('deliveries')
          .insert([{
            order_id: order.id,
            provider_id: selectedShipping.provider_id,
            delivery_address: `${formData.delivery_address}, ${formData.delivery_city}`,
            recipient_name: formData.recipient_name || 'Customer',
            recipient_phone: formData.recipient_phone || '08123456789',
            delivery_notes: formData.delivery_notes,
            delivery_fee: deliveryFee,
            status: 'PENDING'
          }])

        // Create order items
        const orderItems = sellerItems.map(item => ({
          order_id: order.id,
          listing_id: item.listingId,
          product_name: item.title,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.price * item.quantity
        }))

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems)

        if (itemsError) throw itemsError

        // Create order status history
        await supabase
          .from('order_status_history')
          .insert([{
            order_id: order.id,
            status: 'PENDING',
            notes: 'Order created, waiting for payment',
            created_by: user.id
          }])

        orderIds.push(order.order_number)
      }

      // Get user profile for payment
      const { data: profile } = await supabase
        .from('users')
        .select('full_name, phone')
        .eq('id', user.id)
        .single()

      // Prepare item details for Midtrans (must include delivery fee)
      const midtransItems = [
        ...items.map(item => ({
          id: item.listingId,
          name: item.title,
          price: item.price,
          quantity: item.quantity
        }))
      ]

      // Add delivery fee as separate item if not zero
      if (deliveryFee > 0) {
        midtransItems.push({
          id: 'delivery-fee',
          name: `Ongkir - ${selectedShipping.provider_name}`,
          price: deliveryFee,
          quantity: 1
        })
      }

      // Create payment with Midtrans
      const paymentResponse = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderIds[0], // Use first order ID as main reference
          amount: totalAmount,
          customerDetails: {
            first_name: profile?.full_name || 'Customer',
            email: user.email || 'customer@example.com',
            phone: profile?.phone || '08123456789'
          },
          itemDetails: midtransItems
        })
      })

      const paymentData = await paymentResponse.json()

      if (!paymentData.success) {
        throw new Error(paymentData.error || 'Failed to create payment')
      }

      // Clear cart
      clearCart()

      // Open Midtrans Snap popup
      // @ts-ignore
      window.snap.pay(paymentData.token, {
        onSuccess: function(result: any) {
          console.log('Payment success:', result)
          router.push(`/orders/${orderIds[0]}?status=success`)
        },
        onPending: function(result: any) {
          console.log('Payment pending:', result)
          router.push(`/orders/${orderIds[0]}?status=pending`)
        },
        onError: function(result: any) {
          console.log('Payment error:', result)
          router.push(`/orders/${orderIds[0]}?status=error`)
        },
        onClose: function() {
          console.log('Payment popup closed')
          router.push('/orders')
        }
      })
    } catch (error) {
      console.error('Error creating order:', error)
      alert('Gagal membuat pesanan: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    router.push('/marketplace/cart')
    return null
  }

  const deliveryFee = selectedShipping?.cost || 0
  const totalAmount = getTotalAmount() + deliveryFee

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/marketplace/cart" className="text-green-600 hover:text-green-700">
                ← Keranjang
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">Checkout</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">📦 Checkout</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Delivery Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Informasi Pengiriman</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nama Penerima *</label>
                    <input
                      type="text"
                      required
                      value={formData.recipient_name}
                      onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg"
                      placeholder="Nama lengkap penerima"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">No. Telepon Penerima *</label>
                    <input
                      type="tel"
                      required
                      value={formData.recipient_phone}
                      onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg"
                      placeholder="08123456789"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Kota Tujuan *</label>
                    <select
                      required
                      value={formData.delivery_city}
                      onChange={(e) => setFormData({ ...formData, delivery_city: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg"
                    >
                      <option value="Jakarta">Jakarta</option>
                      <option value="Bogor">Bogor</option>
                      <option value="Depok">Depok</option>
                      <option value="Tangerang">Tangerang</option>
                      <option value="Bekasi">Bekasi</option>
                      <option value="Bandung">Bandung</option>
                      <option value="Surabaya">Surabaya</option>
                      <option value="Semarang">Semarang</option>
                      <option value="Yogyakarta">Yogyakarta</option>
                      <option value="Medan">Medan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Alamat Lengkap *</label>
                    <textarea
                      required
                      value={formData.delivery_address}
                      onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg"
                      rows={3}
                      placeholder="Jl. Contoh No. 123, Kelurahan, Kecamatan"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Catatan (Opsional)</label>
                    <textarea
                      value={formData.delivery_notes}
                      onChange={(e) => setFormData({ ...formData, delivery_notes: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg"
                      rows={2}
                      placeholder="Catatan untuk penjual atau kurir"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Method */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Metode Pengiriman</h2>
                
                {loadingShipping ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Memuat opsi pengiriman...</p>
                  </div>
                ) : shippingOptions.length === 0 ? (
                  <p className="text-gray-600">Pilih kota tujuan untuk melihat opsi pengiriman</p>
                ) : (
                  <div className="space-y-3">
                    {shippingOptions.map((option) => (
                      <label
                        key={option.provider_id}
                        className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition ${
                          selectedShipping?.provider_id === option.provider_id
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shipping"
                            checked={selectedShipping?.provider_id === option.provider_id}
                            onChange={() => setSelectedShipping(option)}
                            className="w-4 h-4 text-green-600"
                          />
                          <div>
                            <div className="font-semibold">{option.provider_name}</div>
                            <div className="text-sm text-gray-600">{option.description}</div>
                            {option.estimated_days > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                Estimasi: {option.estimated_days} hari
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="font-bold text-green-600">
                          {option.cost === 0 ? 'Gratis' : formatCurrency(option.cost)}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Produk yang Dipesan</h2>
                
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.listingId} className="flex gap-4 pb-4 border-b last:border-0">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                        📦
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="text-sm text-gray-600">{item.sellerName}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantity} {item.unit} × {formatCurrency(item.price)}
                        </p>
                      </div>
                      <div className="text-right font-semibold">
                        {formatCurrency(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 sticky top-4">
                <h2 className="text-xl font-bold mb-4">Ringkasan Pesanan</h2>

                <div className="space-y-3 mb-4 pb-4 border-b">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatCurrency(getTotalAmount())}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Ongkir</span>
                    <span>{deliveryFee === 0 ? 'Gratis' : formatCurrency(deliveryFee)}</span>
                  </div>
                </div>

                <div className="flex justify-between text-xl font-bold mb-6">
                  <span>Total</span>
                  <span className="text-green-600">{formatCurrency(totalAmount)}</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                >
                  {loading ? 'Memproses...' : 'Buat Pesanan'}
                </button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Dengan membuat pesanan, Anda menyetujui syarat dan ketentuan kami
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <>
      <Script
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="lazyOnload"
      />
      <ProtectedRoute>
        <CheckoutContent />
      </ProtectedRoute>
    </>
  )
}
