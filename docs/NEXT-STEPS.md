# PasarSuara Pintar - Next Steps (Aligned with PROJECT2.md)

**Last Updated:** December 2, 2025

---

## 📊 Current Status

### ✅ Phase 1: Core Messaging (100% COMPLETE)
- WhatsApp integration working
- Audio processing (Gemini STT)
- Rich messaging (buttons, lists)
- Database writes enabled

### 🟡 Phase 2: AI Agents (80% COMPLETE)
**Completed:**
- ✅ Basic intent extraction with Gemini fallback
- ✅ Finance Agent (sale, purchase, expense)
- ✅ Negotiation Agent (demo sellers)
- ✅ Inventory Agent (auto-update, low stock alerts)
- ✅ Promo Agent (catalog generation)

**Remaining (20%):**
- Context awareness integration
- Number format parsing
- Ambiguity resolution
- Financial reports
- Receipt OCR

---

## 🎯 Phase 2 Completion Plan

### Week 1: Intent Engine Enhancement (2.1)

#### Day 1-2: Number Format Parsing ⚠️ CRITICAL
**Estimated Time:** 4 hours
**Priority:** HIGH

**What to Build:**
```go
// Pre-process text untuk normalize numbers
func normalizeNumbers(text string) string {
    // "15rb" → "15000"
    // "25kg" → "25 kg"
    // "12.000" → "12000"
    // "2,5jt" → "2500000"
}
```

**Test Cases:**
- "laku nasi 10 porsi 15rb" → 15000
- "cari beras 25kg budget 300rb" → 25 kg, 300000
- "bayar listrik 1.250.000" → 1250000
- "beli minyak 2,5 liter" → 2.5 liter

**Files to Modify:**
- `apps/backend/internal/ai/intent_engine.go`
- Add pre-processing before intent extraction

---

#### Day 3-4: Context Awareness Integration ⚠️ CRITICAL
**Estimated Time:** 6 hours
**Priority:** HIGH

**What to Build:**
1. Integrate ConversationManager to orchestrator
2. Store conversation history per user
3. Use context to fill missing entities

**Implementation:**
```go
// In orchestrator.go
type AgentOrchestrator struct {
    // ... existing fields
    contextMgr *context.ConversationManager
}

// Before processing intent
ctx := o.contextMgr.GetContext(userID)
lastEntities := ctx.LastEntities

// Merge with current entities
if currentIntent.Entities["product"] == "" {
    currentIntent.Entities["product"] = lastEntities["product"]
}
```

**Test Scenario:**
```
User: "laku nasi goreng 10 porsi"
Bot: "Harga berapa?"
User: "15 ribu"  ← Should know this is for nasi goreng
```

**Files to Modify:**
- `apps/backend/internal/agents/orchestrator.go`
- `apps/backend/cmd/main.go` (initialize ConversationManager)

---

#### Day 5: Ambiguity Resolution 🟡 IMPORTANT
**Estimated Time:** 6 hours
**Priority:** MEDIUM

**What to Build:**
1. Detect incomplete entities
2. Generate clarification questions
3. Use button messages for options

**Implementation:**
```go
func (o *AgentOrchestrator) checkAmbiguity(intent *ai.Intent) *AmbiguityCheck {
    missing := []string{}
    
    if intent.Action == "RECORD_SALE" {
        if intent.Entities["product"] == "" {
            missing = append(missing, "product")
        }
        if intent.Entities["qty"] == 0 {
            missing = append(missing, "qty")
        }
        if intent.Entities["price"] == 0 {
            missing = append(missing, "price")
        }
    }
    
    if len(missing) > 0 {
        return &AmbiguityCheck{
            HasAmbiguity: true,
            Missing: missing,
            Question: generateQuestion(missing[0]),
        }
    }
    
    return nil
}
```

**Test Cases:**
- "laku nasi goreng" → "Berapa porsi?"
- "laku 10 porsi" → "Produk apa?"
- "laku nasi goreng 10 porsi" → "Harga berapa?"

**Files to Create:**
- `apps/backend/internal/agents/ambiguity.go`

---

### Week 2: Finance Agent Enhancement (2.2)

#### Day 1-2: Daily/Weekly Reports ⚠️ IMPORTANT
**Estimated Time:** 6 hours
**Priority:** HIGH

**What to Build:**
```go
func (f *FinanceAgent) GenerateDailyReport(ctx context.Context, userID string) string {
    // Query transactions for today
    sales := getTodaySales(ctx, userID)
    purchases := getTodayPurchases(ctx, userID)
    expenses := getTodayExpenses(ctx, userID)
    
    profit := sales - purchases - expenses
    
    return formatReport(sales, purchases, expenses, profit)
}
```

**Report Format:**
```
📊 Laporan Hari Ini (2 Des 2025)

💰 Penjualan: Rp 450.000
🛒 Pembelian: Rp 300.000
💸 Pengeluaran: Rp 50.000
━━━━━━━━━━━━━━━━━━
📈 Laba Bersih: Rp 100.000

Top Produk:
1. Nasi Goreng - 15 porsi
2. Ayam Geprek - 8 porsi
3. Es Teh - 20 gelas
```

**Trigger:**
- User: "laporan hari ini"
- User: "laporan minggu ini"
- User: "laporan bulan ini"

**Files to Modify:**
- `apps/backend/internal/agents/finance.go`
- Add new intent: `REQUEST_REPORT`

---

#### Day 3: Auto-Categorization 🟡 MEDIUM
**Estimated Time:** 4 hours
**Priority:** MEDIUM

**What to Build:**
```go
func categorizeExpense(productName string) string {
    categories := map[string][]string{
        "BAHAN_BAKU": {"beras", "minyak", "telur", "cabai", "bawang"},
        "OPERASIONAL": {"listrik", "air", "gas", "wifi"},
        "GAJI": {"gaji", "upah", "bonus"},
        "TRANSPORTASI": {"bensin", "ojek", "grab", "gojek"},
        "LAIN": {},
    }
    
    // Match product name to category
    // Use AI if no match
}
```

**Files to Modify:**
- `apps/backend/internal/agents/finance.go`

---

#### Day 4-5: Receipt OCR 🟢 LOW (Optional)
**Estimated Time:** 8 hours
**Priority:** LOW

**What to Build:**
1. Use Gemini Vision API
2. Extract items, prices, total from receipt photo
3. Auto-create transactions

**Implementation:**
```go
func (f *FinanceAgent) ProcessReceiptOCR(ctx context.Context, imageData []byte) (*ReceiptData, error) {
    // Call Gemini Vision API
    prompt := "Extract all items, quantities, prices, and total from this receipt. Return as JSON."
    
    result := gemini.AnalyzeImage(ctx, imageData, prompt)
    
    // Parse JSON response
    // Create transactions
}
```

**Test:**
- User kirim foto struk
- Bot extract data
- Bot confirm: "Ditemukan 5 item, total Rp 125.000. Simpan?"

---

### Week 3: Database & User Management (Phase 3 & 4)

#### Day 1-2: Multi-User Registration ⚠️ CRITICAL
**Estimated Time:** 8 hours
**Priority:** HIGH

**What to Build:**
1. User registration flow via WhatsApp
2. Phone number verification
3. User profile setup

**Flow:**
```
New User: "halo"
Bot: "Halo! Selamat datang di PasarSuara Pintar! 👋

Untuk mulai, saya perlu beberapa info:
1. Nama bisnis Anda?
2. Jenis usaha? (warung/toko/supplier/dll)
3. Lokasi?"

User: "Warung Makan Bu Siti, warung makan, Bandung"
Bot: "Terima kasih! Akun Anda sudah aktif. ✅"
```

**Files to Create:**
- `apps/backend/internal/agents/onboarding.go`
- Add user state machine

---

#### Day 3: Real-time Dashboard Connection 🟡 MEDIUM
**Estimated Time:** 6 hours
**Priority:** MEDIUM

**What to Build:**
1. Connect dashboard to real database
2. Replace demo data with live queries
3. Add refresh mechanism

**Files to Modify:**
- `apps/web/src/app/dashboard/page.tsx`
- `apps/backend/internal/api/router.go`

---

#### Day 4-5: Testing & Bug Fixes
**Estimated Time:** 10 hours
**Priority:** HIGH

**Activities:**
1. End-to-end testing all flows
2. Fix bugs
3. Improve error messages
4. Performance optimization

---

## 📅 3-Week Timeline

### Week 1: Intent Engine (Phase 2.1)
- ✅ Day 1-2: Number format parsing
- ✅ Day 3-4: Context awareness
- ✅ Day 5: Ambiguity resolution

### Week 2: Finance Agent (Phase 2.2)
- ✅ Day 1-2: Daily/weekly reports
- ✅ Day 3: Auto-categorization
- 🟢 Day 4-5: Receipt OCR (optional)

### Week 3: User Management & Testing
- ✅ Day 1-2: Multi-user registration
- ✅ Day 3: Real-time dashboard
- ✅ Day 4-5: Testing & bug fixes

---

## 🎯 Success Criteria

### Phase 2 Complete When:
- [x] Inventory auto-update working
- [x] Low stock alerts working
- [ ] Number format parsing working
- [ ] Context awareness working
- [ ] Ambiguity resolution working
- [ ] Daily reports working
- [ ] Multi-user registration working

### Ready for Pilot When:
- [ ] All Phase 2 features complete
- [ ] Tested with 5 internal users
- [ ] No critical bugs
- [ ] Error handling robust
- [ ] Documentation complete

---

## 🚀 After Phase 2

### Phase 3: Database Enhancement (Week 4-5)
- Product catalog table
- Supplier/customer management
- Payment records
- Audit logging

### Phase 4: Dashboard Full Features (Week 6-7)
- Authentication
- Real-time updates (WebSocket)
- Charts & analytics
- Export functionality

### Phase 5-12: Advanced Features (Week 8-24)
- Marketplace
- Payment integration
- Logistics
- Advanced AI
- Multi-channel
- Scale & performance
- Production deployment
- User onboarding

---

## 💡 Quick Wins (Can Do Now)

### 1. Number Format Parser (2 hours)
**Impact:** HIGH - Users can type naturally
**Effort:** LOW
**Do it:** ✅ YES

### 2. Daily Report (3 hours)
**Impact:** HIGH - Users want to see summary
**Effort:** LOW
**Do it:** ✅ YES

### 3. Better Error Messages (2 hours)
**Impact:** MEDIUM - Better UX
**Effort:** LOW
**Do it:** ✅ YES

### 4. Context Integration (4 hours)
**Impact:** HIGH - Natural conversation
**Effort:** MEDIUM
**Do it:** ✅ YES

---

## 📊 Progress Tracking

| Feature | Status | ETA |
|---------|--------|-----|
| Number Format Parsing | 🔴 Not Started | Day 1-2 |
| Context Awareness | 🟡 Code Ready | Day 3-4 |
| Ambiguity Resolution | 🔴 Not Started | Day 5 |
| Daily Reports | 🔴 Not Started | Week 2 |
| Auto-Categorization | 🔴 Not Started | Week 2 |
| Receipt OCR | 🔴 Not Started | Week 2 (optional) |
| Multi-User Registration | 🔴 Not Started | Week 3 |
| Real-time Dashboard | 🔴 Not Started | Week 3 |

---

## 🎯 Recommendation

**Start with:** Number Format Parsing (2 hours)
**Why:** Quick win, high impact, enables natural input
**Then:** Context Integration (4 hours)
**Why:** Makes conversation natural, big UX improvement

**This Week Goal:** Complete Phase 2.1 (Intent Engine Enhancement)

---

**Ready to start?** Let's begin with Number Format Parsing! 🚀
