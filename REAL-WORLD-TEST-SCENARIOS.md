# Real-World Test Scenarios - PasarSuara Pintar

**Test Date:** December 2, 2025  
**Tester:** System Validation  
**Environment:** Local Development

---

## 🎯 Test Objectives

1. Validate all Phase 2 features work in real scenarios
2. Test edge cases and error handling
3. Verify user experience is smooth
4. Collect performance metrics
5. Identify bugs before merge

---

## 📋 Test Scenarios

### Scenario 1: Warung Makan - Daily Operations

**Persona:** Bu Siti, pemilik warung makan  
**Goal:** Catat penjualan harian dengan berbagai format input

#### Test Cases:

**1.1 Sale with "rb" format**
```
Input: "laku nasi goreng 5 porsi 15rb"
Expected: 
- Price parsed as 15000 ✅
- Stock decreased ✅
- Transaction saved ✅
```

**1.2 Sale with "ribu" format**
```
Input: "laku ayam geprek 3 porsi 20 ribu"
Expected:
- Price parsed as 20000 ✅
- Stock decreased ✅
```

**1.3 Sale with dot separator**
```
Input: "laku es teh 10 gelas 3.000"
Expected:
- Price parsed as 3000 ✅
- Stock decreased ✅
```

**1.4 Sale triggering low stock alert**
```
Input: "laku telur 90 butir 2500"
Expected:
- Stock: 100 → 10 butir ✅
- Alert: "📉 Stok Menipis" ✅
```

**1.5 Daily report request**
```
Input: "laporan hari ini"
Expected:
- Show daily summary ✅
- Format correct ✅
```

---

### Scenario 2: Toko Kelontong - Inventory Management

**Persona:** Pak Budi, pemilik toko kelontong  
**Goal:** Manage inventory dengan auto-update

#### Test Cases:

**2.1 Purchase with "kg" format**
```
Input: "beli beras 50kg 12rb per kg"
Expected:
- Quantity: 50 kg ✅
- Price: 12000/kg ✅
- Stock increased ✅
```

**2.2 Check stock**
```
Input: "stok beras berapa"
Expected:
- Show current stock ✅
- Show unit ✅
```

**2.3 Multiple sales in sequence**
```
Input 1: "laku beras 5kg 13rb"
Input 2: "laku minyak 2 liter 17rb"
Input 3: "laku telur 20 butir 2500"
Expected:
- All stocks updated ✅
- Context maintained ✅
```

---

### Scenario 3: Pedagang Pasar - Quick Transactions

**Persona:** Ibu Ani, pedagang sayur di pasar  
**Goal:** Catat transaksi cepat dengan format singkat

#### Test Cases:

**3.1 Quick sale format**
```
Input: "laku cabai 2kg 50rb"
Expected:
- Parse correctly ✅
- Fast response ✅
```

**3.2 Multiple items same time**
```
Input: "laku cabai 2kg 50rb, bawang 3kg 35rb"
Expected:
- Parse multiple items ✅
- Create separate transactions ✅
```

**3.3 Price inquiry**
```
Input: "harga cabai berapa"
Expected:
- Show market price ✅
- Show trend ✅
```

---

### Scenario 4: Supplier - Negotiation & Bulk Orders

**Persona:** Pak Joyo, supplier beras  
**Goal:** Handle bulk orders with negotiation

#### Test Cases:

**4.1 Bulk order request**
```
Input: "cari beras 100kg budget 1,2jt"
Expected:
- Parse "1,2jt" as 1200000 ✅
- Start negotiation ✅
- Find sellers ✅
```

**4.2 Negotiation flow**
```
Input: "cari minyak 50 liter budget 800rb"
Expected:
- Negotiation starts ✅
- Multiple turns ✅
- Deal reached ✅
```

---

### Scenario 5: Edge Cases & Error Handling

#### Test Cases:

**5.1 Incomplete information**
```
Input: "laku nasi goreng"
Expected:
- Detect missing qty & price ✅
- Ask clarification (future) 🟡
- Or use context (future) 🟡
```

**5.2 Invalid product**
```
Input: "laku produk-tidak-ada 10 porsi 15rb"
Expected:
- Transaction saved ✅
- No inventory update (product not found) ✅
```

**5.3 Negative stock scenario**
```
Input: "laku nasi goreng 100 porsi 15rb"
Expected:
- Transaction saved ✅
- Stock goes negative (needs validation) ⚠️
```

**5.4 Very large numbers**
```
Input: "laku beras 1000kg 15jt"
Expected:
- Parse "15jt" as 15000000 ✅
- Handle large transaction ✅
```

**5.5 Mixed language**
```
Input: "tadi payu nasi goreng 10 porsi 15rb"
Expected:
- Understand Javanese "payu" ✅
- Parse correctly ✅
```

---

### Scenario 6: Context & Multi-Turn Conversation

#### Test Cases:

**6.1 Context from previous message**
```
Input 1: "laku nasi goreng 10 porsi"
Input 2: "15rb"
Expected:
- Use "nasi goreng" from context ✅
- Use "10 porsi" from context ✅
- Complete transaction ✅
```

**6.2 Multiple questions**
```
Input 1: "stok telur berapa"
Bot: "📦 Stok telur: 15 butir"
Input 2: "beli lagi 50 butir"
Expected:
- Use "telur" from context ✅
- Create purchase ✅
```

---

### Scenario 7: Reports & Analytics

#### Test Cases:

**7.1 Daily report**
```
Input: "laporan hari ini"
Expected:
- Show today's summary ✅
- Include sales, purchases, expenses ✅
- Show profit ✅
- Show top products ✅
```

**7.2 Weekly report**
```
Input: "laporan minggu ini"
Expected:
- Show weekly summary ✅
- Calculate totals ✅
```

**7.3 Monthly report**
```
Input: "laporan bulan ini"
Expected:
- Show monthly summary ✅
- Show daily average ✅
```

---

## 🧪 Test Execution

### Test 1: Number Format Parsing
