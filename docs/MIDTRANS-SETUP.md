# 🔐 Midtrans Payment Gateway Setup Guide

**For:** PasarSuara Pintar  
**Date:** December 2, 2025

---

## 📋 Overview

This guide will help you setup Midtrans payment gateway for PasarSuara Pintar, enabling digital payments for marketplace transactions.

---

## 🚀 Quick Start (Sandbox/Testing)

### 1. Create Midtrans Account

1. Go to [https://dashboard.midtrans.com/register](https://dashboard.midtrans.com/register)
2. Sign up with your email
3. Verify your email
4. Complete business profile

### 2. Get API Keys (Sandbox)

1. Login to [Midtrans Dashboard](https://dashboard.sandbox.midtrans.com/)
2. Go to **Settings** → **Access Keys**
3. Copy your keys:
   - **Server Key:** `SB-Mid-server-xxxxx`
   - **Client Key:** `SB-Mid-client-xxxxx`

### 3. Configure Environment Variables

Update your `.env` file:

```env
# Midtrans Payment Gateway (SANDBOX)
MIDTRANS_SERVER_KEY=SB-Mid-server-YOUR_SERVER_KEY_HERE
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-YOUR_CLIENT_KEY_HERE
MIDTRANS_IS_PRODUCTION=false

# App URL (for callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Test Payment

1. Start your application:
   ```bash
   cd apps/web
   npm run dev
   ```

2. Go to marketplace and add items to cart
3. Proceed to checkout
4. Fill delivery information
5. Click "Buat Pesanan"
6. Midtrans popup will appear
7. Use test credentials:

#### Test Credit Cards
```
Card Number: 4811 1111 1111 1114
CVV: 123
Exp: 01/25
OTP: 112233
```

#### Test E-Wallets
- **GoPay:** Use test phone number `081234567890`
- **OVO:** Use test phone number `081234567890`
- **Dana:** Use test phone number `081234567890`

#### Test Bank Transfer
- Select any bank
- You'll get a virtual account number
- Payment will auto-complete in sandbox

---

## 🏭 Production Setup

### 1. Business Verification

1. Login to [Midtrans Dashboard](https://dashboard.midtrans.com/)
2. Go to **Settings** → **Business Settings**
3. Complete business verification:
   - Business documents (NPWP, SIUP, etc)
   - Bank account information
   - Business address
   - Contact information

**Note:** Verification takes 1-3 business days

### 2. Get Production Keys

1. After verification approved
2. Go to **Settings** → **Access Keys**
3. Switch to **Production** tab
4. Copy your production keys:
   - **Server Key:** `Mid-server-xxxxx`
   - **Client Key:** `Mid-client-xxxxx`

### 3. Configure Production Environment

Update your production `.env`:

```env
# Midtrans Payment Gateway (PRODUCTION)
MIDTRANS_SERVER_KEY=Mid-server-YOUR_PRODUCTION_SERVER_KEY
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=Mid-client-YOUR_PRODUCTION_CLIENT_KEY
MIDTRANS_IS_PRODUCTION=true

# Production URL
NEXT_PUBLIC_APP_URL=https://pasarsuara.com
```

### 4. Setup Webhook URL

1. Go to **Settings** → **Configuration**
2. Set **Payment Notification URL:**
   ```
   https://pasarsuara.com/api/payment/webhook
   ```
3. Enable **HTTP Notification**
4. Save settings

### 5. Configure Payment Methods

1. Go to **Settings** → **Payment Configuration**
2. Enable payment methods:
   - ✅ Credit Card (Visa, Mastercard, JCB)
   - ✅ Bank Transfer (BCA, Mandiri, BNI, BRI, Permata)
   - ✅ E-Wallet (GoPay, OVO, Dana, ShopeePay)
   - ✅ QRIS
   - ✅ Convenience Store (Indomaret, Alfamart)

3. Configure fees and limits
4. Save settings

---

## 🔧 Configuration Options

### Payment Settings

```javascript
// In apps/web/src/app/api/payment/create/route.ts

const parameter = {
  transaction_details: {
    order_id: orderId,
    gross_amount: amount
  },
  customer_details: {
    first_name: customerName,
    email: customerEmail,
    phone: customerPhone
  },
  item_details: itemDetails,
  
  // Optional: Enable specific payment methods
  enabled_payments: [
    'credit_card',
    'gopay',
    'shopeepay',
    'other_qris',
    'bca_va',
    'bni_va',
    'bri_va',
    'permata_va',
    'echannel', // Mandiri Bill
    'other_va',
    'indomaret',
    'alfamart'
  ],
  
  // Optional: Credit card settings
  credit_card: {
    secure: true,
    bank: 'bca', // Acquiring bank
    installment: {
      required: false,
      terms: {
        bni: [3, 6, 12],
        mandiri: [3, 6, 12],
        cimb: [3],
        bca: [3, 6, 12],
        mega: [3, 6, 12]
      }
    }
  },
  
  // Callbacks
  callbacks: {
    finish: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}?status=success`,
    error: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}?status=error`,
    pending: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}?status=pending`
  }
}
```

### Webhook Security

The webhook handler automatically verifies signatures:

```javascript
// Signature verification
const hash = crypto
  .createHash('sha512')
  .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
  .digest('hex')

if (hash !== signature_key) {
  return error('Invalid signature')
}
```

---

## 🧪 Testing Checklist

### Sandbox Testing

- [ ] Credit card payment (success)
- [ ] Credit card payment (failed)
- [ ] GoPay payment
- [ ] Bank transfer (BCA VA)
- [ ] Bank transfer (Mandiri Bill)
- [ ] QRIS payment
- [ ] Convenience store (Indomaret)
- [ ] Payment expiry
- [ ] Webhook notification
- [ ] Order status update
- [ ] Payment history display

### Production Testing

- [ ] Small amount transaction (Rp 10,000)
- [ ] Real credit card
- [ ] Real e-wallet
- [ ] Real bank transfer
- [ ] Webhook in production
- [ ] SSL certificate valid
- [ ] Payment confirmation email
- [ ] Refund process (if needed)

---

## 📊 Monitoring & Analytics

### Midtrans Dashboard

1. **Transaction List**
   - View all transactions
   - Filter by status, date, amount
   - Export to CSV

2. **Settlement Report**
   - Daily settlement summary
   - Bank transfer details
   - Fee breakdown

3. **Performance Metrics**
   - Success rate
   - Payment method distribution
   - Average transaction value

### Application Monitoring

Check these in your app:

```sql
-- Payment success rate
SELECT 
  COUNT(*) FILTER (WHERE status = 'PAID') * 100.0 / COUNT(*) as success_rate
FROM payments
WHERE created_at > NOW() - INTERVAL '7 days';

-- Payment method distribution
SELECT 
  payment_method,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM payments
WHERE status = 'PAID'
GROUP BY payment_method
ORDER BY count DESC;

-- Failed payments
SELECT *
FROM payments
WHERE status = 'FAILED'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🚨 Troubleshooting

### Common Issues

#### 1. Snap Popup Not Opening

**Problem:** Midtrans popup doesn't appear

**Solutions:**
- Check if Snap.js is loaded: `window.snap`
- Verify client key is correct
- Check browser console for errors
- Ensure HTTPS in production

#### 2. Webhook Not Received

**Problem:** Order status not updating

**Solutions:**
- Verify webhook URL is accessible
- Check Midtrans dashboard for webhook logs
- Test webhook with ngrok/localtunnel locally
- Verify signature verification logic

#### 3. Signature Mismatch

**Problem:** Webhook returns "Invalid signature"

**Solutions:**
- Verify server key is correct
- Check order_id format matches
- Ensure gross_amount is integer (no decimals)
- Check status_code is string

#### 4. Payment Stuck in Pending

**Problem:** Payment shows pending forever

**Solutions:**
- Check Midtrans dashboard for actual status
- Call status API: `/api/payment/status/[orderId]`
- Verify webhook is working
- Check if customer completed payment

---

## 💰 Fees & Pricing

### Midtrans Fees (Approximate)

| Payment Method | Fee |
|----------------|-----|
| Credit Card | 2.9% + Rp 2,000 |
| Debit Card | 1.5% + Rp 2,000 |
| GoPay | 2% |
| OVO | 2% |
| Dana | 2% |
| ShopeePay | 2% |
| Bank Transfer | Rp 4,000 flat |
| QRIS | 0.7% |
| Convenience Store | Rp 4,000 flat |

**Note:** Fees may vary based on your agreement with Midtrans

### Settlement Time

| Payment Method | Settlement |
|----------------|------------|
| Credit Card | T+3 days |
| Debit Card | T+3 days |
| E-Wallet | T+1 day |
| Bank Transfer | T+1 day |
| QRIS | T+1 day |
| Convenience Store | T+2 days |

---

## 📞 Support

### Midtrans Support
- **Email:** support@midtrans.com
- **Phone:** +62 21 2963 5577
- **Docs:** https://docs.midtrans.com
- **Status:** https://status.midtrans.com

### PasarSuara Support
- **Developer:** Check GitHub issues
- **Documentation:** `/docs` folder
- **API Reference:** `/docs/PHASE3-API-REFERENCE.md`

---

## 🎯 Next Steps

After setup complete:

1. ✅ Test all payment methods
2. ✅ Monitor first transactions
3. ✅ Setup alerts for failed payments
4. ✅ Configure settlement account
5. ✅ Train support team
6. ✅ Create user payment guide
7. ✅ Setup refund process

---

## 📚 Additional Resources

- [Midtrans Documentation](https://docs.midtrans.com)
- [Snap Integration Guide](https://docs.midtrans.com/en/snap/overview)
- [Webhook Guide](https://docs.midtrans.com/en/after-payment/http-notification)
- [Testing Guide](https://docs.midtrans.com/en/technical-reference/sandbox-test)
- [API Reference](https://api-docs.midtrans.com)

---

**Last Updated:** December 2, 2025  
**Version:** 1.0
