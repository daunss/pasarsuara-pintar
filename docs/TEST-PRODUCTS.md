# 🛒 Test Products - PasarSuara Pintar Marketplace

**Total Products:** 20  
**Seller:** Warung Bu Siti  
**Status:** All ACTIVE

---

## 📦 Product Catalog

### 🌾 Bahan Pokok (5 items)

| No | Produk | Harga | Unit | Stock |
|----|--------|-------|------|-------|
| 1 | Beras Premium 5kg | Rp 65,000 | pack | 50 |
| 2 | Minyak Goreng 2L | Rp 32,000 | botol | 30 |
| 3 | Telur Ayam Negeri | Rp 28,000 | kg | 100 |
| 4 | Gula Pasir 1kg | Rp 15,000 | kg | 40 |
| 5 | Kopi Bubuk Robusta 250g | Rp 25,000 | pack | 25 |

### 🥬 Sayuran & Buah (4 items)

| No | Produk | Harga | Unit | Stock |
|----|--------|-------|------|-------|
| 6 | Cabai Merah Keriting | Rp 45,000 | kg | 20 |
| 7 | Bawang Merah | Rp 38,000 | kg | 30 |
| 8 | Tomat Segar | Rp 12,000 | kg | 25 |
| 9 | Pisang Cavendish | Rp 18,000 | kg | 40 |

### 🧂 Bumbu & Rempah (3 items)

| No | Produk | Harga | Unit | Stock |
|----|--------|-------|------|-------|
| 10 | Garam Dapur 500g | Rp 5,000 | pack | 50 |
| 11 | Merica Bubuk 100g | Rp 15,000 | pack | 30 |
| 12 | Kecap Manis 600ml | Rp 18,000 | botol | 35 |

### ☕ Minuman (2 items)

| No | Produk | Harga | Unit | Stock |
|----|--------|-------|------|-------|
| 13 | Teh Celup 25 bags | Rp 12,000 | box | 40 |
| 14 | Susu UHT 1L | Rp 22,000 | box | 30 |

### 🍪 Snack & Makanan (2 items)

| No | Produk | Harga | Unit | Stock |
|----|--------|-------|------|-------|
| 15 | Kerupuk Udang 250g | Rp 20,000 | pack | 25 |
| 16 | Mie Instan Goreng (5 pcs) | Rp 12,000 | pack | 50 |

### 🧼 Kebutuhan Rumah (2 items)

| No | Produk | Harga | Unit | Stock |
|----|--------|-------|------|-------|
| 17 | Sabun Cuci Piring 800ml | Rp 15,000 | botol | 30 |
| 18 | Tissue Gulung (3 roll) | Rp 18,000 | pack | 40 |

### 🍗 Protein (2 items)

| No | Produk | Harga | Unit | Stock |
|----|--------|-------|------|-------|
| 19 | Daging Ayam Fillet 1kg | Rp 45,000 | kg | 15 |
| 20 | Ikan Bandeng Segar | Rp 35,000 | kg | 20 |

---

## 🧪 Recommended Test Scenarios

### Scenario 1: Small Order (Budget: ~Rp 50,000)
```
Cart:
- Garam Dapur 500g (1x) = Rp 5,000
- Mie Instan Goreng (2x) = Rp 24,000
- Teh Celup 25 bags (1x) = Rp 12,000
- Gula Pasir 1kg (1x) = Rp 15,000

Total: Rp 56,000
```

### Scenario 2: Medium Order (Budget: ~Rp 150,000)
```
Cart:
- Beras Premium 5kg (1x) = Rp 65,000
- Minyak Goreng 2L (1x) = Rp 32,000
- Telur Ayam Negeri (1kg) = Rp 28,000
- Cabai Merah Keriting (0.5kg) = Rp 22,500
- Bawang Merah (0.5kg) = Rp 19,000

Total: Rp 166,500
```

### Scenario 3: Large Order (Budget: ~Rp 300,000)
```
Cart:
- Beras Premium 5kg (2x) = Rp 130,000
- Minyak Goreng 2L (2x) = Rp 64,000
- Daging Ayam Fillet 1kg (1x) = Rp 45,000
- Telur Ayam Negeri (1kg) = Rp 28,000
- Cabai Merah Keriting (1kg) = Rp 45,000

Total: Rp 312,000
```

### Scenario 4: Mixed Categories (Budget: ~Rp 200,000)
```
Cart:
- Beras Premium 5kg (1x) = Rp 65,000
- Daging Ayam Fillet 1kg (1x) = Rp 45,000
- Ikan Bandeng Segar (1kg) = Rp 35,000
- Susu UHT 1L (2x) = Rp 44,000
- Tissue Gulung (1x) = Rp 18,000

Total: Rp 207,000
```

---

## 💳 Payment Test Amounts

### Small Transactions (Good for quick tests)
- Rp 5,000 - Garam Dapur
- Rp 12,000 - Mie Instan / Teh Celup
- Rp 15,000 - Gula Pasir / Merica Bubuk

### Medium Transactions (Realistic orders)
- Rp 50,000 - 100,000
- Rp 100,000 - 200,000

### Large Transactions (Bulk orders)
- Rp 200,000 - 300,000
- Rp 300,000+

---

## 🎯 Testing Tips

### 1. Test Different Payment Methods
- Start with Credit Card (easiest)
- Try GoPay/E-Wallet
- Test Bank Transfer
- Try QRIS

### 2. Test Different Order Sizes
- Single item
- Multiple items same category
- Multiple items different categories
- Large quantity orders

### 3. Test Edge Cases
- Minimum order (1 item)
- Maximum stock (test stock limits)
- Mixed units (kg, pack, botol, box)

---

## 📊 Quick Stats

| Category | Items | Price Range |
|----------|-------|-------------|
| Bahan Pokok | 5 | Rp 15K - 65K |
| Sayuran & Buah | 4 | Rp 12K - 45K |
| Bumbu & Rempah | 3 | Rp 5K - 18K |
| Minuman | 2 | Rp 12K - 22K |
| Snack & Makanan | 2 | Rp 12K - 20K |
| Kebutuhan Rumah | 2 | Rp 15K - 18K |
| Protein | 2 | Rp 35K - 45K |

**Total Items:** 20  
**Price Range:** Rp 5,000 - Rp 65,000  
**Average Price:** ~Rp 24,000

---

## 🚀 Start Testing

1. Open: http://localhost:3000/marketplace
2. Browse products
3. Add items to cart
4. Proceed to checkout
5. Complete payment

**Happy Testing!** 🛒💳

---

**Last Updated:** December 2, 2025  
**Version:** 1.0
