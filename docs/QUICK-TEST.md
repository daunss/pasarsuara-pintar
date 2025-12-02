# ⚡ Quick Test - Payment Flow

**Status:** Ready to Test  
**URL:** http://localhost:3000

---

## 🚀 Quick Start Testing

### 1. Open Browser
```
http://localhost:3000
```

### 2. Register/Login
- **Register:** http://localhost:3000/register
- **Login:** http://localhost:3000/login

**Test Credentials:**
```
Email: test@pasarsuara.com
Password: Test123456
```

### 3. Test Flow

#### A. Marketplace Flow ✅
```
1. Go to: http://localhost:3000/marketplace
2. Browse products
3. Click a product
4. Add to cart
5. View cart: http://localhost:3000/marketplace/cart
```

#### B. Checkout Flow ✅
```
1. From cart, click "Checkout"
2. Fill delivery info:
   Address: Jl. Test No. 123, Jakarta
   Notes: Test order
3. Click "Buat Pesanan"
```

#### C. Payment Flow ⚠️
```
Without Midtrans Keys:
- Will show error (expected)
- Order still created
- Status: PENDING

With Midtrans Keys:
- Snap popup appears
- Select payment method
- Complete payment
- Order status: CONFIRMED
```

#### D. View Results ✅
```
1. Orders: http://localhost:3000/orders
2. Payments: http://localhost:3000/payments
3. Dashboard: http://localhost:3000/dashboard
```

---

## 🧪 Test Without Midtrans Keys

**What Works:**
- ✅ User registration/login
- ✅ Browse marketplace
- ✅ Add to cart
- ✅ Checkout form
- ✅ Order creation
- ✅ View orders

**What Doesn't Work:**
- ❌ Payment popup (needs Midtrans keys)
- ❌ Payment processing
- ❌ Webhook updates

**Expected Behavior:**
- Order created with status: PENDING
- Payment status: PENDING
- Error message about payment gateway

---

## 💳 Test With Midtrans Keys

### Setup
1. Get Midtrans sandbox account: https://dashboard.sandbox.midtrans.com/register
2. Get API keys from Settings → Access Keys
3. Update `.env`:
   ```env
   MIDTRANS_SERVER_KEY=SB-Mid-server-YOUR_KEY
   NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-YOUR_KEY
   ```
4. Restart dev server

### Test Payment
**Test Credit Card:**
```
Card Number: 4811 1111 1111 1114
CVV: 123
Exp Date: 01/25
OTP: 112233
```

**Test E-Wallet:**
- GoPay: Use phone 081234567890
- OVO: Use phone 081234567890
- Dana: Use phone 081234567890

**Expected Result:**
- ✅ Snap popup appears
- ✅ Payment successful
- ✅ Order status: CONFIRMED
- ✅ Payment status: PAID
- ✅ Redirect to order detail

---

## 🔍 Quick Checks

### Browser Console (F12)
```javascript
// Check if Snap loaded
console.log(window.snap)

// Check cart
console.log(localStorage.getItem('cart'))

// Check user session
console.log(document.cookie)
```

### Network Tab
Look for these API calls:
- `/api/payment/create` - Create payment
- `/api/payment/webhook` - Payment notification
- `/api/payment/status/[orderId]` - Check status

### Database Check
```sql
-- Recent orders
SELECT * FROM orders ORDER BY created_at DESC LIMIT 5;

-- Recent payments
SELECT * FROM payments ORDER BY created_at DESC LIMIT 5;
```

---

## 🐛 Quick Troubleshooting

### Issue: Can't login
**Solution:** Check if user exists in database or register new user

### Issue: No products in marketplace
**Solution:** Add test products via seller dashboard or database

### Issue: Cart empty after refresh
**Solution:** Normal - cart uses localStorage, check if items were added

### Issue: Payment popup not showing
**Solution:** Check Midtrans keys in .env and restart server

### Issue: Order created but payment failed
**Solution:** Normal without Midtrans keys, order will be PENDING

---

## ✅ Success Criteria

### Minimum (Without Payment)
- [x] User can register/login
- [x] User can browse marketplace
- [x] User can add to cart
- [x] User can checkout
- [x] Order created in database
- [x] User can view orders

### Full (With Payment)
- [ ] Payment popup appears
- [ ] Payment successful
- [ ] Order status updated
- [ ] Payment recorded
- [ ] User can view payment history

---

## 📊 Test Results

**Date:** _____________  
**Tester:** _____________

| Feature | Status | Notes |
|---------|--------|-------|
| Registration | [ ] Pass [ ] Fail | |
| Login | [ ] Pass [ ] Fail | |
| Marketplace | [ ] Pass [ ] Fail | |
| Cart | [ ] Pass [ ] Fail | |
| Checkout | [ ] Pass [ ] Fail | |
| Payment | [ ] Pass [ ] Fail | |
| Orders | [ ] Pass [ ] Fail | |
| Payment History | [ ] Pass [ ] Fail | |

**Overall:** [ ] Pass [ ] Fail

**Issues Found:**
1. ___________________________________
2. ___________________________________
3. ___________________________________

---

## 🎯 Next Steps

### If Testing Passes
1. ✅ Get production Midtrans keys
2. ✅ Deploy to production
3. ✅ Test in production
4. ✅ Launch beta

### If Testing Fails
1. ❌ Document issues
2. ❌ Fix bugs
3. ❌ Re-test
4. ❌ Repeat until pass

---

**Ready to test?** Open http://localhost:3000 and start! 🚀
