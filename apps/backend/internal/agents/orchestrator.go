package agents

import (
	"context"
	"fmt"
	"log"

	"github.com/pasarsuara/backend/internal/ai"
	"github.com/pasarsuara/backend/internal/database"
)

// AgentOrchestrator coordinates all agents based on intent
type AgentOrchestrator struct {
	db           *database.SupabaseClient
	finance      *FinanceAgent
	negotiation  *NegotiationOrchestrator
	promo        *PromoAgent
	intentEngine *ai.IntentEngine
}

// AgentResponse represents the response from agent processing
type AgentResponse struct {
	Success     bool                  `json:"success"`
	Message     string                `json:"message"`
	Intent      *ai.Intent            `json:"intent,omitempty"`
	Transaction *database.Transaction `json:"transaction,omitempty"`
	Negotiation *NegotiationResult    `json:"negotiation,omitempty"`
}

func NewAgentOrchestrator(db *database.SupabaseClient, intentEngine *ai.IntentEngine, kolosal *ai.KolosalClient, kolosalKey, kolosalURL, geminiKey string) *AgentOrchestrator {
	return &AgentOrchestrator{
		db:           db,
		finance:      NewFinanceAgent(db),
		negotiation:  NewNegotiationOrchestrator(db, kolosal),
		promo:        NewPromoAgent(db, kolosalKey, kolosalURL, geminiKey),
		intentEngine: intentEngine,
	}
}

// GetPromoAgent returns the promo agent for external use
func (o *AgentOrchestrator) GetPromoAgent() *PromoAgent {
	return o.promo
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

	// Step 2: Get or create user
	userID := o.getUserID(ctx, userPhone)

	// Step 3: Route to appropriate agent based on intent
	response := &AgentResponse{
		Success: true,
		Intent:  intent,
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
		}

	case "RECORD_EXPENSE":
		tx, err := o.finance.RecordExpense(ctx, userID, intent)
		if err != nil {
			response.Success = false
			response.Message = "Gagal mencatat pengeluaran: " + err.Error()
		} else {
			response.Transaction = tx
			response.Message = o.formatExpenseResponse(tx)
		}

	case "ORDER_RESTOCK":
		negResult := o.negotiation.StartNegotiation(ctx, userID, intent)
		response.Negotiation = negResult
		if negResult.Success {
			// Record the purchase
			tx, _ := o.finance.RecordPurchase(ctx, userID, intent, negResult.FinalPrice)
			response.Transaction = tx
			response.Message = o.formatNegotiationSuccess(negResult)
		} else {
			response.Message = o.formatNegotiationFailed(negResult)
		}

	case "CHECK_STOCK":
		response.Message = o.handleCheckStock(ctx, userID, intent)

	case "ASK_MARKET":
		response.Message = o.handleMarketIntel(ctx, intent)

	case "REQUEST_PROMO":
		response.Message = o.handlePromoRequest(ctx, userID, intent)

	case "GREETING":
		response.Message = o.getGreetingResponse(userPhone)

	default:
		response.Message = o.intentEngine.GenerateResponse(intent)
	}

	return response
}

func (o *AgentOrchestrator) getUserID(ctx context.Context, phone string) string {
	if o.db == nil {
		// Return demo user ID based on phone
		return "11111111-1111-1111-1111-111111111111"
	}

	user, err := o.db.GetUserByPhone(ctx, phone)
	if err != nil || user == nil {
		// Return demo user if not found
		return "11111111-1111-1111-1111-111111111111"
	}
	return user.ID
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
	return fmt.Sprintf("💸 Pengeluaran tercatat!\n\n"+
		"📝 Item: %s\n"+
		"💰 Biaya: Rp %.0f\n\n"+
		"Pengeluaran sudah dicatat di buku kas.",
		tx.ProductName, tx.TotalAmount)
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

func (o *AgentOrchestrator) handleMarketIntel(ctx context.Context, intent *ai.Intent) string {
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

func (o *AgentOrchestrator) getGreetingResponse(phone string) string {
	return fmt.Sprintf("👋 Halo! Selamat datang di PasarSuara Pintar!\n\n" +
		"Saya asisten bisnis Anda. Anda bisa:\n" +
		"• 📝 Catat penjualan: \"laku nasi 10 porsi\"\n" +
		"• 🛒 Pesan barang: \"cari beras 25 kg\"\n" +
		"• 📊 Cek harga: \"harga cabai berapa\"\n" +
		"• 📦 Cek stok: \"stok telur berapa\"\n\n" +
		"Ada yang bisa saya bantu? 😊")
}
