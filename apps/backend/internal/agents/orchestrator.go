package agents

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/pasarsuara/backend/internal/ai"
	appcontext "github.com/pasarsuara/backend/internal/context"
	"github.com/pasarsuara/backend/internal/database"
)

// senderJIDKey is a context key for passing the raw WA sender JID
type senderJIDKeyType struct{}

var senderJIDKey = senderJIDKeyType{}

// WithSenderJID attaches the raw WA sender JID to the context
func WithSenderJID(ctx context.Context, jid string) context.Context {
	return context.WithValue(ctx, senderJIDKey, jid)
}

// GetSenderJID retrieves the raw WA sender JID from context
func GetSenderJID(ctx context.Context) string {
	if v, ok := ctx.Value(senderJIDKey).(string); ok {
		return v
	}
	return ""
}

// AgentOrchestrator coordinates all agents based on intent
type AgentOrchestrator struct {
	db            *database.SupabaseClient
	finance       *FinanceAgent
	negotiation   *NegotiationOrchestrator
	realNegotiate *SupplierNegotiationService
	promo         *PromoAgent
	inventory     *InventoryAgent
	catalog       *CatalogAgent
	contact       *ContactAgent
	notification  *NotificationAgent
	intentEngine  *ai.IntentEngine
	contextMgr    *appcontext.ConversationManager
}

// AgentResponse represents the response from agent processing
type AgentResponse struct {
	Success     bool                  `json:"success"`
	Message     string                `json:"message"`
	Intent      *ai.Intent            `json:"intent,omitempty"`
	Transaction *database.Transaction `json:"transaction,omitempty"`
	Negotiation *NegotiationResult    `json:"negotiation,omitempty"`
}

func NewAgentOrchestrator(db *database.SupabaseClient, intentEngine *ai.IntentEngine, kolosal *ai.KolosalClient, kolosalKey, kolosalURL, geminiKey string, contextMgr *appcontext.ConversationManager, waSender WhatsAppSender, qrisClient QrisPaymentClient) *AgentOrchestrator {
	finance := NewFinanceAgent(db)
	inventory := NewInventoryAgent(db)
	geminiClient := ai.NewGeminiClient(geminiKey)
	return &AgentOrchestrator{
		db:            db,
		finance:       finance,
		negotiation:   NewNegotiationOrchestrator(db, kolosal),
		realNegotiate: NewSupplierNegotiationService(db, waSender, kolosal, geminiClient, finance, inventory, qrisClient),
		promo:         NewPromoAgent(db, kolosalKey, kolosalURL, geminiKey),
		inventory:     inventory,
		catalog:       NewCatalogAgent(db),
		contact:       NewContactAgent(db),
		notification:  NewNotificationAgent(db),
		intentEngine:  intentEngine,
		contextMgr:    contextMgr,
	}
}

// GetPromoAgent returns the promo agent for external use
func (o *AgentOrchestrator) GetPromoAgent() *PromoAgent {
	return o.promo
}

// ProcessAudio handles incoming audio message
func (o *AgentOrchestrator) ProcessAudio(ctx context.Context, userPhone string, audioData []byte, mimeType string) *AgentResponse {
	log.Printf("🎯 Orchestrator processing audio from %s: %d bytes", userPhone, len(audioData))

	// Step 1: Transcribe audio to text using Gemini
	transcript, err := o.intentEngine.ProcessAudio(ctx, audioData, mimeType)
	if err != nil {
		log.Printf("❌ Audio transcription failed: %v", err)
		return &AgentResponse{
			Success: false,
			Message: "Maaf, voice note tidak bisa diproses. Coba kirim pesan teks ya! 🙏",
		}
	}

	log.Printf("📝 Transcript: %s", transcript.RawText)

	// Step 2: Process the transcript as text
	return o.processIntent(ctx, userPhone, transcript)
}

// ProcessImage handles incoming image (receipt/financial record photo)
func (o *AgentOrchestrator) ProcessImage(ctx context.Context, userPhone string, imageData []byte, mimeType, caption string) *AgentResponse {
	log.Printf("📷 Orchestrator processing image from %s: %d bytes", userPhone, len(imageData))

	userID := o.getUserID(ctx, userPhone)

	// Analyze image with Gemini Vision
	receipt, err := o.intentEngine.ProcessImage(ctx, imageData, mimeType, caption)
	if err != nil {
		log.Printf("❌ Image analysis failed: %v", err)
		return &AgentResponse{
			Success: false,
			Message: "Maaf, foto tidak bisa diproses. Pastikan foto jelas dan coba lagi ya! 🙏",
		}
	}

	if len(receipt.Items) == 0 {
		return &AgentResponse{
			Success: false,
			Message: "📷 Foto diterima tapi tidak ada item yang terdeteksi.\n\nPastikan foto menampilkan nota/struk/catatan keuangan dengan jelas.",
		}
	}

	// Process each item: create transaction + inventory
	var successCount, failCount int
	var totalAmount float64
	var responseLines []string

	responseLines = append(responseLines, fmt.Sprintf("📸 *%s*\n", receipt.Summary))

	for i, item := range receipt.Items {
		if item.Product == "" || item.Price <= 0 {
			continue
		}

		// Fix total if not set
		if item.Total <= 0 {
			item.Total = item.Qty * item.Price
		}
		if item.Qty <= 0 {
			item.Qty = 1
		}

		// Create intent for this item
		intent := &ai.Intent{
			Entities: map[string]any{
				"product": item.Product,
				"qty":     item.Qty,
				"price":   item.Price,
				"unit":    item.Unit,
			},
			RawText: fmt.Sprintf("[Foto] %s x%.0f @ Rp%.0f", item.Product, item.Qty, item.Price),
		}

		// Determine action type
		switch item.Type {
		case "SALE":
			intent.Action = "RECORD_SALE"
			tx, err := o.finance.RecordSale(ctx, userID, intent)
			if err != nil {
				log.Printf("❌ Failed to record sale from photo item %d: %v", i+1, err)
				failCount++
				continue
			}
			_ = tx

			// Auto-update inventory
			if o.inventory != nil {
				o.inventory.UpdateStockAfterSale(ctx, userID, intent)
			}

			responseLines = append(responseLines, fmt.Sprintf("✅ Jual: %s x%.0f = Rp %.0f", item.Product, item.Qty, item.Total))

		case "PURCHASE":
			intent.Action = "RECORD_EXPENSE"
			tx, err := o.finance.RecordExpense(ctx, userID, intent)
			if err != nil {
				log.Printf("❌ Failed to record purchase from photo item %d: %v", i+1, err)
				failCount++
				continue
			}
			_ = tx

			// Auto-update inventory (add stock)
			if o.inventory != nil {
				o.inventory.UpdateStockAfterPurchase(ctx, userID, intent, item.Qty)
			}

			responseLines = append(responseLines, fmt.Sprintf("✅ Beli: %s x%.0f = Rp %.0f", item.Product, item.Qty, item.Total))

		default: // EXPENSE
			intent.Action = "RECORD_EXPENSE"
			tx, err := o.finance.RecordExpense(ctx, userID, intent)
			if err != nil {
				log.Printf("❌ Failed to record expense from photo item %d: %v", i+1, err)
				failCount++
				continue
			}
			_ = tx

			responseLines = append(responseLines, fmt.Sprintf("✅ Biaya: %s = Rp %.0f", item.Product, item.Total))
		}

		successCount++
		totalAmount += item.Total
	}

	// Build final response
	responseLines = append(responseLines, "")
	responseLines = append(responseLines, fmt.Sprintf("📊 Total: %d item tercatat, Rp %.0f", successCount, totalAmount))
	if failCount > 0 {
		responseLines = append(responseLines, fmt.Sprintf("⚠️ %d item gagal diproses", failCount))
	}

	return &AgentResponse{
		Success: true,
		Message: strings.Join(responseLines, "\n"),
	}
}

// processMultiItemIntent handles intents with multiple products (e.g., "laku nasi goreng 10 pcs dan batagor 10 pcs")
func (o *AgentOrchestrator) processMultiItemIntent(ctx context.Context, userID string, intent *ai.Intent) *AgentResponse {
	log.Printf("📦 Processing multi-item intent: %d items, action=%s", len(intent.Items), intent.Action)

	var responseLines []string
	var successCount, failCount int
	var totalAmount float64

	isSale := intent.Action == "RECORD_SALE"

	if isSale {
		responseLines = append(responseLines, "✅ *Penjualan tercatat!*\n")
	} else {
		responseLines = append(responseLines, "💸 *Pengeluaran tercatat!*\n")
	}

	for i, item := range intent.Items {
		if item.Product == "" {
			continue
		}

		// Build a single-item intent for each product
		itemIntent := &ai.Intent{
			Action: intent.Action,
			Entities: map[string]any{
				"product": item.Product,
				"qty":     item.Qty,
				"unit":    item.Unit,
				"price":   item.Price,
			},
			RawText: intent.RawText,
		}

		qty := item.Qty
		if qty <= 0 {
			qty = 1
		}
		price := item.Price
		itemTotal := qty * price

		if isSale {
			tx, err := o.finance.RecordSale(ctx, userID, itemIntent)
			if err != nil {
				log.Printf("❌ Failed to record sale for item %d (%s): %v", i+1, item.Product, err)
				failCount++
				responseLines = append(responseLines, fmt.Sprintf("❌ %s — gagal dicatat", item.Product))
				continue
			}
			_ = tx

			// Auto-update inventory
			if o.inventory != nil {
				alert, err := o.inventory.UpdateStockAfterSale(ctx, userID, itemIntent)
				if err != nil {
					log.Printf("⚠️ Failed to update inventory for %s: %v", item.Product, err)
				} else if alert != nil {
					responseLines = append(responseLines, fmt.Sprintf("✅ %s x%.0f %s @ Rp %.0f = Rp %.0f ⚠️%s",
						item.Product, qty, item.Unit, price, itemTotal, o.inventory.FormatStockAlert(alert)))
					successCount++
					totalAmount += itemTotal
					continue
				}
			}
		} else {
			tx, err := o.finance.RecordExpense(ctx, userID, itemIntent)
			if err != nil {
				log.Printf("❌ Failed to record expense for item %d (%s): %v", i+1, item.Product, err)
				failCount++
				responseLines = append(responseLines, fmt.Sprintf("❌ %s — gagal dicatat", item.Product))
				continue
			}
			_ = tx

			// Auto-update inventory for purchases
			if o.inventory != nil && qty > 0 {
				err := o.inventory.UpdateStockAfterPurchase(ctx, userID, itemIntent, qty)
				if err != nil {
					log.Printf("⚠️ Failed to update inventory for %s: %v", item.Product, err)
				}
			}
		}

		if price > 0 {
			responseLines = append(responseLines, fmt.Sprintf("✅ %s x%.0f %s @ Rp %.0f = Rp %.0f",
				item.Product, qty, item.Unit, price, itemTotal))
		} else {
			responseLines = append(responseLines, fmt.Sprintf("✅ %s x%.0f %s",
				item.Product, qty, item.Unit))
		}
		successCount++
		totalAmount += itemTotal
	}

	// Summary
	responseLines = append(responseLines, "")
	if totalAmount > 0 {
		responseLines = append(responseLines, fmt.Sprintf("📊 Total: %d item, Rp %.0f", successCount, totalAmount))
	} else {
		responseLines = append(responseLines, fmt.Sprintf("📊 Total: %d item tercatat", successCount))
	}
	if failCount > 0 {
		responseLines = append(responseLines, fmt.Sprintf("⚠️ %d item gagal diproses", failCount))
	}

	return &AgentResponse{
		Success: successCount > 0,
		Intent:  intent,
		Message: strings.Join(responseLines, "\n"),
	}
}

// ProcessMessage handles incoming message and routes to appropriate agent
func (o *AgentOrchestrator) ProcessMessage(ctx context.Context, userPhone, text string) *AgentResponse {
	log.Printf("🎯 Orchestrator processing message from %s: %s", userPhone, text)

	// Step 1: Extract intent
	intent, err := o.intentEngine.ProcessText(ctx, text)
	if err != nil {
		log.Printf("❌ Intent extraction failed: %v", err)
		return &AgentResponse{
			Success: false,
			Message: "Maaf, ada kendala teknis. Coba lagi ya!",
		}
	}

	return o.processIntent(ctx, userPhone, intent)
}

// processIntent handles intent routing to agents
func (o *AgentOrchestrator) processIntent(ctx context.Context, userPhone string, intent *ai.Intent) *AgentResponse {
	// Get or create user
	userID := o.getUserID(ctx, userPhone)

	// Get conversation context
	if o.contextMgr != nil {
		lastEntities := o.contextMgr.GetLastEntities(userPhone)

		// Fill missing entities from context
		if intent.Entities["product"] == nil || intent.Entities["product"] == "" {
			if lastProduct, ok := lastEntities["product"]; ok {
				intent.Entities["product"] = lastProduct
				log.Printf("🔄 Using product from context: %v", lastProduct)
			}
		}
		if intent.Entities["qty"] == nil || getFloatEntity(intent.Entities, "qty") == 0 {
			if lastQty, ok := lastEntities["qty"]; ok {
				intent.Entities["qty"] = lastQty
				log.Printf("🔄 Using qty from context: %v", lastQty)
			}
		}
		if intent.Entities["price"] == nil || getFloatEntity(intent.Entities, "price") == 0 {
			if lastPrice, ok := lastEntities["price"]; ok {
				intent.Entities["price"] = lastPrice
				log.Printf("🔄 Using price from context: %v", lastPrice)
			}
		}

		// Store current message in context
		o.contextMgr.AddMessage(userPhone, "user", intent.RawText, intent.Action, intent.Entities)
	}

	// Check for ambiguity AFTER filling from context
	ambiguityCheck := CheckAmbiguity(intent)
	if ambiguityCheck.HasAmbiguity {
		log.Printf("❓ Ambiguity detected: missing %v", ambiguityCheck.Missing)

		// Store partial intent in context for next message
		if o.contextMgr != nil {
			o.contextMgr.AddMessage(userPhone, "system", "waiting_for_clarification", intent.Action, intent.Entities)
		}

		return &AgentResponse{
			Success: false,
			Intent:  intent,
			Message: FormatAmbiguityResponse(ambiguityCheck),
		}
	}

	// Route to appropriate agent based on intent
	response := &AgentResponse{
		Success: true,
		Intent:  intent,
	}

	// Check for multi-item intent (multiple products in one message)
	if len(intent.Items) > 1 && (intent.Action == "RECORD_SALE" || intent.Action == "RECORD_EXPENSE") {
		return o.processMultiItemIntent(ctx, userID, intent)
	}

	switch intent.Action {
	case "RECORD_SALE":
		tx, err := o.finance.RecordSale(ctx, userID, intent)
		if err != nil {
			response.Success = false
			response.Message = "Gagal mencatat penjualan: " + err.Error()
		} else {
			response.Transaction = tx
			response.Message = o.formatSaleResponse(tx)

			// Auto-update inventory
			if o.inventory != nil {
				alert, err := o.inventory.UpdateStockAfterSale(ctx, userID, intent)
				if err != nil {
					log.Printf("⚠️ Failed to update inventory: %v", err)
				} else if alert != nil {
					// Append stock alert to response
					response.Message += "\n\n" + o.inventory.FormatStockAlert(alert)
				}
			}
		}

	case "RECORD_EXPENSE":
		tx, err := o.finance.RecordExpense(ctx, userID, intent)
		if err != nil {
			response.Success = false
			response.Message = "Gagal mencatat pengeluaran: " + err.Error()
		} else {
			response.Transaction = tx
			response.Message = o.formatExpenseResponse(tx)

			// Auto-update inventory for product purchases (beli beras, beli gula, etc.)
			product := getStringEntity(intent.Entities, "product")
			qty := getFloatEntity(intent.Entities, "qty")
			if o.inventory != nil && product != "" && qty > 0 {
				err := o.inventory.UpdateStockAfterPurchase(ctx, userID, intent, qty)
				if err != nil {
					log.Printf("⚠️ Failed to update inventory after expense: %v", err)
				}
			}
		}

	case "ORDER_RESTOCK":
		if o.realNegotiate != nil && o.realNegotiate.Enabled() {
			response.Message = o.realNegotiate.StartNegotiation(ctx, userPhone, userID, intent)
			response.Success = true
			break
		}

		negResult := o.negotiation.StartNegotiation(ctx, userID, intent)
		response.Negotiation = negResult
		if negResult.Success {
			// Record the purchase
			tx, _ := o.finance.RecordPurchase(ctx, userID, intent, negResult.FinalPrice)
			response.Transaction = tx
			response.Message = o.formatNegotiationSuccess(negResult)

			// Auto-update inventory
			if o.inventory != nil {
				err := o.inventory.UpdateStockAfterPurchase(ctx, userID, intent, negResult.Quantity)
				if err != nil {
					log.Printf("⚠️ Failed to update inventory: %v", err)
				}
			}
		} else {
			response.Message = o.formatNegotiationFailed(negResult)
		}

	case "CHECK_STOCK":
		response.Message = o.handleCheckStock(ctx, userID, intent)

	case "ASK_MARKET":
		response.Message = o.handleMarketIntel(intent)

	case "REQUEST_PROMO":
		response.Message = o.handlePromoRequest(ctx, userID, intent)

	case "REQUEST_REPORT":
		response.Message = o.handleReportRequest(ctx, userID, intent)

	case "GREETING":
		response.Message = o.getGreetingResponse()

	default:
		response.Message = o.intentEngine.GenerateResponse(intent)
	}

	// Store assistant response in context
	if o.contextMgr != nil {
		o.contextMgr.AddMessage(userPhone, "assistant", response.Message, intent.Action, nil)
	}

	return response
}

// HandleSupplierMessage routes supplier replies to the real negotiation service.
func (o *AgentOrchestrator) HandleSupplierMessage(ctx context.Context, phone, message string) (bool, string) {
	if o.realNegotiate == nil {
		return false, ""
	}
	return o.realNegotiate.HandleSupplierMessage(ctx, phone, message)
}

func (o *AgentOrchestrator) getUserID(ctx context.Context, phone string) string {
	if o.db == nil {
		log.Printf("⚠️ Database not configured, using demo user ID for phone: %s", phone)
		return "11111111-1111-1111-1111-111111111111"
	}

	// Get the raw sender JID from context (may differ from phone for LID users)
	senderJID := GetSenderJID(ctx)

	// Try phone lookup first
	user, err := o.db.GetUserByPhone(ctx, phone)
	if err == nil && user != nil {
		// Auto-save the WA sender JID so future LID-based lookups work
		if senderJID != "" && senderJID != user.WASenderID {
			go o.db.SaveWASenderID(context.Background(), user.ID, senderJID)
			log.Printf("💾 Auto-saved WA sender JID %s for user %s", senderJID, user.ID)
		}
		log.Printf("✅ Matched phone %s to user %s (%s)", phone, user.ID, user.Email)
		return user.ID
	}

	// Try WA sender ID lookup (for LID-based senders)
	if senderJID != "" && senderJID != phone {
		user, err = o.db.GetUserByWASenderID(ctx, senderJID)
		if err == nil && user != nil {
			log.Printf("✅ Matched WA sender JID %s to user %s (%s)", senderJID, user.ID, user.Email)
			return user.ID
		}
	}

	// Also try the phone value as WA sender ID
	user, err = o.db.GetUserByWASenderID(ctx, phone)
	if err == nil && user != nil {
		// Auto-save the real sender JID if available
		if senderJID != "" && senderJID != phone && senderJID != user.WASenderID {
			go o.db.SaveWASenderID(context.Background(), user.ID, senderJID)
			log.Printf("💾 Auto-saved WA sender JID %s for user %s", senderJID, user.ID)
		}
		log.Printf("✅ Matched WA sender ID %s to user %s (%s)", phone, user.ID, user.Email)
		return user.ID
	}

	log.Printf("⚠️ User not found for phone/sender: %s (JID: %s, err=%v), using demo user ID", phone, senderJID, err)
	return "11111111-1111-1111-1111-111111111111"
}

func (o *AgentOrchestrator) formatSaleResponse(tx *database.Transaction) string {
	return fmt.Sprintf("✅ Penjualan tercatat!\n\n"+
		"📦 Produk: %s\n"+
		"📊 Jumlah: %.0f\n"+
		"💰 Harga: Rp %.0f\n"+
		"💵 Total: Rp %.0f\n\n"+
		"Terima kasih! Semoga laris manis 🙏",
		tx.ProductName, tx.Qty, tx.PricePerUnit, tx.TotalAmount)
}

func (o *AgentOrchestrator) formatExpenseResponse(tx *database.Transaction) string {
	// Auto-categorize expense
	category := CategorizeExpense(tx.ProductName)
	categoryInfo := FormatCategoryInfo(category)

	return fmt.Sprintf("💸 Pengeluaran tercatat!\n\n"+
		"📝 Item: %s\n"+
		"💰 Biaya: Rp %.0f\n"+
		"🏷️ Kategori: %s\n\n"+
		"Pengeluaran sudah dicatat di buku kas.",
		tx.ProductName, tx.TotalAmount, categoryInfo)
}

func (o *AgentOrchestrator) formatNegotiationSuccess(neg *NegotiationResult) string {
	return fmt.Sprintf("🎉 Negosiasi Berhasil!\n\n"+
		"📦 Produk: %s\n"+
		"📊 Jumlah: %.0f unit\n"+
		"💰 Harga: Rp %.0f/unit\n"+
		"💵 Total: Rp %.0f\n"+
		"🏪 Penjual: %s\n\n"+
		"Pesanan akan segera diproses!",
		neg.ProductName, neg.Quantity, neg.FinalPrice, neg.TotalAmount, neg.SellerName)
}

func (o *AgentOrchestrator) formatNegotiationFailed(neg *NegotiationResult) string {
	msg := fmt.Sprintf("😔 Negosiasi Gagal\n\n"+
		"📦 Produk: %s\n"+
		"❌ Alasan: %s\n\n",
		neg.ProductName, neg.ErrorMessage)

	if len(neg.Messages) > 0 {
		msg += "📜 Log Negosiasi:\n"
		for _, m := range neg.Messages {
			msg += fmt.Sprintf("• %s\n", m.Content)
		}
	}

	msg += "\nCoba dengan budget lebih tinggi atau produk lain."
	return msg
}

func (o *AgentOrchestrator) handleCheckStock(ctx context.Context, userID string, intent *ai.Intent) string {
	product := getStringEntity(intent.Entities, "product")

	if o.db != nil && product != "" {
		inv, err := o.db.GetInventoryByProduct(ctx, userID, product)
		if err == nil && inv != nil {
			return fmt.Sprintf("📦 Stok %s: %.0f %s\n\nHarga jual min: Rp %.0f",
				inv.ProductName, inv.StockQty, inv.Unit, inv.MinSellPrice)
		}
	}

	if product != "" {
		return fmt.Sprintf("📦 Stok %s belum tercatat.\n\nMau tambahkan ke inventory?", product)
	}
	return "📦 Produk apa yang ingin dicek stoknya?"
}

func (o *AgentOrchestrator) handleMarketIntel(intent *ai.Intent) string {
	product := getStringEntity(intent.Entities, "product")

	// Demo market intel
	marketPrices := map[string]string{
		"beras":  "📊 Harga Beras di Pasar:\n• Premium: Rp 11.500 - 13.000/kg\n• Medium: Rp 10.000 - 11.000/kg\n\n📈 Tren: Stabil",
		"cabai":  "📊 Harga Cabai di Pasar:\n• Merah Keriting: Rp 40.000 - 50.000/kg\n• Rawit: Rp 45.000 - 55.000/kg\n\n📈 Tren: Naik (musim hujan)",
		"telur":  "📊 Harga Telur di Pasar:\n• Ayam Negeri: Rp 2.200 - 2.500/butir\n• Ayam Kampung: Rp 3.500 - 4.000/butir\n\n📈 Tren: Stabil",
		"minyak": "📊 Harga Minyak Goreng:\n• Curah: Rp 14.000 - 15.000/liter\n• Kemasan: Rp 16.000 - 18.000/liter\n\n📈 Tren: Stabil",
	}

	if product != "" {
		for key, info := range marketPrices {
			if contains(product, key) || contains(key, product) {
				return info
			}
		}
		return fmt.Sprintf("📊 Info harga %s belum tersedia.\n\nCoba tanya: beras, cabai, telur, atau minyak", product)
	}

	return "📊 Mau cek harga apa?\n\nContoh: \"harga beras berapa\" atau \"tren cabai\""
}

func (o *AgentOrchestrator) handlePromoRequest(ctx context.Context, userID string, intent *ai.Intent) string {
	product := getStringEntity(intent.Entities, "product")

	if product == "" {
		// Generate catalog promo
		catalog, err := o.promo.GenerateCatalog(ctx, userID)
		if err != nil {
			return "🎨 Gagal membuat katalog. Coba lagi nanti ya!"
		}

		response := "🎨 Katalog Produk Anda:\n\n"
		for i, item := range catalog {
			response += fmt.Sprintf("%d. %s - Rp %.0f/%s\n", i+1, item.ProductName, item.Price, item.Unit)
			if item.PromoText != "" {
				response += fmt.Sprintf("   📢 %s\n", item.PromoText)
			}
			response += "\n"
		}
		response += "💡 Mau buat promosi untuk produk tertentu? Bilang aja: \"buatkan promosi nasi goreng\""
		return response
	}

	// Generate promo for specific product
	promo, err := o.promo.GeneratePromo(ctx, product, 0, "")
	if err != nil {
		return fmt.Sprintf("🎨 Gagal membuat promosi untuk %s. Coba lagi!", product)
	}

	return fmt.Sprintf("🎨 Promosi untuk %s:\n\n%s\n\n📋 Copy teks di atas untuk share ke WhatsApp atau marketplace!",
		product, o.promo.FormatForWhatsApp(promo))
}

func (o *AgentOrchestrator) getGreetingResponse() string {
	return fmt.Sprintf("👋 Halo! Selamat datang di Suara Niaga Pintar!\n\n" +
		"Saya asisten bisnis Anda. Anda bisa:\n" +
		"• 📝 Catat penjualan: \"laku nasi 10 porsi\"\n" +
		"• 🛒 Pesan barang: \"cari beras 25 kg\"\n" +
		"• 📊 Cek harga: \"harga cabai berapa\"\n" +
		"• 📦 Cek stok: \"stok telur berapa\"\n" +
		"• 📋 Laporan: \"laporan hari ini\"\n\n" +
		"Ada yang bisa saya bantu? 😊")
}

func (o *AgentOrchestrator) handleReportRequest(ctx context.Context, userID string, intent *ai.Intent) string {
	reportAgent := NewReportAgent(o.db)

	// Determine report type from entities or text
	period := getStringEntity(intent.Entities, "period")
	if period == "" {
		// Check raw text for keywords
		rawText := strings.ToLower(intent.RawText)
		if strings.Contains(rawText, "minggu") {
			period = "weekly"
		} else if strings.Contains(rawText, "bulan") {
			period = "monthly"
		} else {
			period = "daily"
		}
	}

	var report *DailyReport
	var err error
	var formatted string

	switch period {
	case "weekly":
		report, err = reportAgent.GenerateWeeklyReport(ctx, userID)
		if err == nil {
			formatted = reportAgent.FormatWeeklyReport(report)
		}
	case "monthly":
		report, err = reportAgent.GenerateMonthlyReport(ctx, userID)
		if err == nil {
			formatted = reportAgent.FormatMonthlyReport(report)
		}
	default:
		report, err = reportAgent.GenerateDailyReport(ctx, userID)
		if err == nil {
			formatted = reportAgent.FormatDailyReport(report)
		}
	}

	if err != nil {
		return "Maaf, gagal membuat laporan. Coba lagi ya!"
	}

	return formatted
}
