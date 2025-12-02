# 🧪 Payment Flow Testing Guide

**Date:** December 2, 2025  
**Status:** Ready for Testing

---

## 🎯 Testing Objectives

Test complete payment flow from marketplace browsing to payment completion.

---

## 📋 Pre-requisites

### Required
- ✅ Dev server running (http://localhost:3000)
- ✅ Database accessible (Supabase)
- ✅ User account created

### Optional (for full payment testing)
- [ ] Midtrans sandbox account
- [ ] Midtrans API keys configured

---

## 🧪 Test Scenarios

### Scenario 1: User Registration & Login ✅

**Steps:**
1. Open http://localhost:3000
2. Click "Register" or go to http://localhost:3000/register
3. Fill registration form:
   - Email: test@example.com
   - Password: Test123456
   - Full Name: Test User
4. Click "Register"
5. Login with credentials

**Expected Result:**
- ✅ User registered successfully
- ✅ Redirected to dashboard
- ✅ User session active

**Actual Result:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Scenario 2: Browse Marketplace ✅

**Steps:**
1. Go to http://localhost:3000/marketplace
2. Browse available products
3. Use search/filter if available
4. Click on a product to view details

**Expected Result:**
- ✅ Products displayed
- ✅ Product details accessible
- ✅ Prices shown correctly
- ✅ Seller information visible

**Actual Result:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Scenario 3: Add to Cart ✅

**Steps:**
1. On product detail page
2. Select quantity
3. Click "Add to Cart"
4. Go to cart (http://localhost:3000/marketplace/cart)
5. Verify items in cart

**Expected Result:**
- ✅ Item added to cart
- ✅ Cart count updated
- ✅ Cart page shows items
- ✅ Subtotal calculated correctly

**Actual Result:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Scenario 4: Checkout Process ✅

**Steps:**
1. From cart page, click "Checkout"
2. Fill delivery information:
   - Address: Jl. Test No. 123, Jakarta
   - Notes: Test order
3. Review order summary
4. Click "Buat Pesanan"

**Expected Result:**
- ✅ Redirected to checkout page
- ✅ Delivery form displayed
- ✅ Order summary correct
- ✅ Total amount calculated

**Actual Result:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Scenario 5: Payment Creation (Without Midtrans) ⚠️

**Note:** This will fail without Midtrans credentials, but we can check the flow.

**Steps:**
1. After clicking "Buat Pesanan"
2. Observe console for errors
3. Check network tab for API calls

**Expected Behavior (Without Keys):**
- ⚠️ Payment API call fails
- ⚠️ Error message shown
- ✅ Order still created in database
- ✅ Order status: PENDING

**Actual Result:**
- [ ] Behaves as expected
- [ ] Different behavior (describe):

---

### Scenario 6: Payment with Midtrans (Full Test) 💳

**Pre-requisite:** Midtrans sandbox keys configured

**Steps:**
1. Complete checkout process
2. Midtrans Snap popup should appear
3. Select payment method (e.g., Credit Card)
4. Use test credentials:
   - Card: 4811 1111 1111 1114
   - CVV: 123
   - Exp: 01/25
   - OTP: 112233
5. Complete payment
6. Verify redirect to order detail

**Expected Result:**
- ✅ Snap popup appears
- ✅ Payment methods displayed
- ✅ Test payment successful
- ✅ Webhook received
- ✅ Order status updated to CONFIRMED
- ✅ Payment status: PAID
- ✅ Redirected to order detail

**Actual Result:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Scenario 7: Order History ✅

**Steps:**
1. Go to http://localhost:3000/orders
2. View order list
3. Click on an order to view details
4. Check order status and payment status

**Expected Result:**
- ✅ Orders displayed
- ✅ Order details accessible
- ✅ Status badges shown
- ✅ Payment status visible

**Actual Result:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Scenario 8: Payment History ✅

**Steps:**
1. Go to http://localhost:3000/payments
2. View payment list
3. Filter by status (All, Paid, Pending, Failed)
4. Click "Lihat Pesanan" to view related order

**Expected Result:**
- ✅ Payments displayed
- ✅ Filter working
- ✅ Payment details shown
- ✅ Link to order working

**Actual Result:**
- [ ] Pass
- [ ] Fail (describe issue):

---

## 🔍 Database Verification

### Check Orders Table

```sql
-- View recent orders
SELECT 
  order_number,
  status,
  payment_status,
  total_amount,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:**
- Orders created with PENDING status
- Payment status: PENDING (without payment) or PAID (with payment)

### Check Payments Table

```sql
-- View recent payments
SELECT 
  amount,
  payment_method,
  status,
  transaction_id,
  created_at
FROM payments
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:**
- Payment records created after successful payment
- Status matches transaction result

---

## 🐛 Common Issues & Solutions

### Issue 1: Snap Popup Not Appearing

**Symptoms:**
- Click "Buat Pesanan" but no popup
- Console error about Snap

**Solutions:**
1. Check if Midtrans script loaded:
   ```javascript
   console.log(window.snap)
   ```
2. Verify NEXT_PUBLIC_MIDTRANS_CLIENT_KEY in .env
3. Check browser console for errors
4. Try different browser

### Issue 2: Payment API Error

**Symptoms:**
- Error creating payment
- 500 status code

**Solutions:**
1. Check MIDTRANS_SERVER_KEY in .env
2. Verify API keys are correct
3. Check server logs
4. Ensure Midtrans account is active

### Issue 3: Webhook Not Received

**Symptoms:**
- Payment successful but order status not updated
- Payment status still PENDING

**Solutions:**
1. Webhook only works in production (with public URL)
2. For local testing, manually update order status
3. Use ngrok/localtunnel for local webhook testing
4. Check Midtrans dashboard for webhook logs

### Issue 4: Order Not Created

**Symptoms:**
- Click checkout but no order in database
- Error message shown

**Solutions:**
1. Check browser console for errors
2. Verify user is logged in
3. Check cart has items
4. Verify database connection
5. Check RLS policies

---

## 📊 Test Results Summary

### Test Coverage

| Scenario | Status | Notes |
|----------|--------|-------|
| User Registration | [ ] | |
| Browse Marketplace | [ ] | |
| Add to Cart | [ ] | |
| Checkout Process | [ ] | |
| Payment Creation | [ ] | |
| Payment with Midtrans | [ ] | Requires API keys |
| Order History | [ ] | |
| Payment History | [ ] | |

### Overall Status
- [ ] All tests passed
- [ ] Some tests failed (see notes)
- [ ] Blocked by missing credentials

---

## 🎯 Next Steps After Testing

### If All Tests Pass ✅
1. Document any issues found
2. Proceed with production setup
3. Get production Midtrans keys
4. Deploy to production

### If Tests Fail ❌
1. Document specific failures
2. Check error messages
3. Review logs
4. Fix issues
5. Re-test

---

## 📞 Support

### For Testing Issues
- Check browser console (F12)
- Check server logs
- Review documentation in `docs/`

### For Midtrans Issues
- Midtrans Docs: https://docs.midtrans.com
- Sandbox Dashboard: https://dashboard.sandbox.midtrans.com
- Test Credentials: https://docs.midtrans.com/en/technical-reference/sandbox-test

---

## 🎓 Testing Tips

1. **Use Browser DevTools**
   - Network tab to see API calls
   - Console for JavaScript errors
   - Application tab for localStorage (cart)

2. **Test Multiple Scenarios**
   - Happy path (everything works)
   - Error cases (invalid data)
   - Edge cases (empty cart, etc)

3. **Document Everything**
   - Take screenshots of issues
   - Copy error messages
   - Note steps to reproduce

4. **Test Different Browsers**
   - Chrome
   - Firefox
   - Edge
   - Safari (if available)

---

## ✅ Quick Test Commands

### Check if services are running
```bash
# Check web app
curl http://localhost:3000

# Check if logged in (should redirect)
curl -I http://localhost:3000/dashboard
```

### Database queries
```sql
-- Count orders
SELECT COUNT(*) FROM orders;

-- Count payments
SELECT COUNT(*) FROM payments;

-- Recent activity
SELECT 'orders' as type, COUNT(*) as count FROM orders
UNION ALL
SELECT 'payments', COUNT(*) FROM payments;
```

---

**Happy Testing!** 🧪

If you encounter any issues, refer to the troubleshooting section or check the documentation.

---

**Last Updated:** December 2, 2025  
**Version:** 1.0
