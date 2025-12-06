package agents

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/pasarsuara/backend/internal/ai"
	"github.com/pasarsuara/backend/internal/database"
)

// NegotiationMessage represents a message in negotiation
type NegotiationMessage struct {
	Role    string `json:"role"` // buyer_agent, seller_agent, system
	Content string `json:"content"`
	Time    string `json:"time"`
}

// NegotiationResult represents the outcome of a negotiation
type NegotiationResult struct {
	Success      bool                 `json:"success"`
	FinalPrice   float64              `json:"final_price,omitempty"`
	SellerID     string               `json:"seller_id,omitempty"`
	SellerName   string               `json:"seller_name,omitempty"`
	ProductName  string               `json:"product_name"`
	Quantity     float64              `json:"quantity"`
	TotalAmount  float64              `json:"total_amount,omitempty"`
	Messages     []NegotiationMessage `json:"messages"`
	ErrorMessage string               `json:"error_message,omitempty"`
}

// BuyerAgent represents the buyer in negotiations
type BuyerAgent struct {
	db       *database.SupabaseClient
	kolosal  *ai.KolosalClient
	userID   string
	userName string
	maxPrice float64
	deadline time.Time
}

// SellerAgent represents a seller in negotiations
type SellerAgent struct {
	db          *database.SupabaseClient
	kolosal     *ai.KolosalClient
	userID      string
	userName    string
	minPrice    float64
	productName string
	stockQty    float64
}

// DatabaseClient interface for negotiation operations
type DatabaseClient interface {
	FindSellers(ctx context.Context, productName string, maxPrice float64) ([]database.Inventory, error)
	CreateNegotiationLog(ctx context.Context, log *database.NegotiationLog) error
	CreateTransaction(ctx context.Context, tx *database.Transaction) error
}

// NegotiationOrchestrator manages the negotiation process
type NegotiationOrchestrator struct {
	db      DatabaseClient
	kolosal *ai.KolosalClient
}

func NewNegotiationOrchestrator(db DatabaseClient, kolosal *ai.KolosalClient) *NegotiationOrchestrator {
	return &NegotiationOrchestrator{
		db:      db,
		kolosal: kolosal,
	}
}

// StartNegotiation initiates a negotiation based on user intent
func (n *NegotiationOrchestrator) StartNegotiation(ctx context.Context, buyerID string, intent *ai.Intent) *NegotiationResult {
	log.Printf("🤝 Starting negotiation for buyer %s", buyerID)

	product := getStringEntity(intent.Entities, "product")
	qty := getFloatEntity(intent.Entities, "qty")
	maxPrice := getFloatEntity(intent.Entities, "max_price")

	if product == "" {
		return &NegotiationResult{
			Success:      false,
			ErrorMessage: "Produk tidak disebutkan",
		}
	}

	if qty == 0 {
		qty = 1 // Default quantity
	}

	if maxPrice == 0 {
		maxPrice = 999999999 // No limit
	}

	result := &NegotiationResult{
		ProductName: product,
		Quantity:    qty,
		Messages:    []NegotiationMessage{},
	}

	// Add initial buyer request
	result.Messages = append(result.Messages, NegotiationMessage{
		Role:    "buyer_agent",
		Content: fmt.Sprintf("Mencari %s %.0f unit, budget maksimal Rp %.0f/unit", product, qty, maxPrice),
		Time:    time.Now().Format(time.RFC3339),
	})

	// Find potential sellers
	var sellers []SellerInfo
	if n.db != nil {
		// Query real sellers from database
		inventories, err := n.db.FindSellers(ctx, product, maxPrice)
		if err != nil {
			log.Printf("⚠️ Failed to find sellers: %v", err)
		}
		for _, inv := range inventories {
			sellers = append(sellers, SellerInfo{
				UserID:      inv.UserID,
				ProductName: inv.ProductName,
				StockQty:    inv.StockQty,
				MinPrice:    inv.MinSellPrice,
			})
		}
	}

	// If no real sellers, use demo data
	if len(sellers) == 0 {
		sellers = n.getDemoSellers(product)
	}

	if len(sellers) == 0 {
		result.Messages = append(result.Messages, NegotiationMessage{
			Role:    "system",
			Content: fmt.Sprintf("Tidak ditemukan penjual untuk %s", product),
			Time:    time.Now().Format(time.RFC3339),
		})
		result.Success = false
		result.ErrorMessage = "Tidak ada penjual yang tersedia"
		return result
	}

	// Simulate negotiation with best seller
	bestSeller := n.findBestSeller(sellers, maxPrice, qty)
	if bestSeller == nil {
		result.Messages = append(result.Messages, NegotiationMessage{
			Role:    "system",
			Content: "Tidak ada penjual yang sesuai budget",
			Time:    time.Now().Format(time.RFC3339),
		})
		result.Success = false
		result.ErrorMessage = "Harga penjual melebihi budget"
		return result
	}

	// Run negotiation rounds
	finalPrice := n.runNegotiation(result, bestSeller, maxPrice, qty)

	if finalPrice > 0 {
		result.Success = true
		result.FinalPrice = finalPrice
		result.SellerID = bestSeller.UserID
		result.SellerName = bestSeller.Name
		result.TotalAmount = finalPrice * qty

		result.Messages = append(result.Messages, NegotiationMessage{
			Role:    "system",
			Content: fmt.Sprintf("✅ Deal! Harga final Rp %.0f/unit. Total Rp %.0f untuk %.0f unit", finalPrice, result.TotalAmount, qty),
			Time:    time.Now().Format(time.RFC3339),
		})

		// Log negotiation to database
		if n.db != nil {
			negLog := &database.NegotiationLog{
				BuyerID:      buyerID,
				SellerID:     bestSeller.UserID,
				ProductName:  product,
				InitialOffer: maxPrice,
				FinalPrice:   finalPrice,
				Status:       "SUCCESS",
				Transcript:   map[string]any{"messages": result.Messages},
			}
			if err := n.db.CreateNegotiationLog(ctx, negLog); err != nil {
				log.Printf("⚠️ Failed to log negotiation: %v", err)
			}

			// Create transaction record for the purchase
			tx := &database.Transaction{
				UserID:       buyerID,
				Type:         "PURCHASE",
				ProductName:  product,
				Qty:          qty,
				PricePerUnit: finalPrice,
				TotalAmount:  result.TotalAmount,
				RawVoiceText: fmt.Sprintf("Negotiated purchase from %s", bestSeller.Name),
			}
			if err := n.db.CreateTransaction(ctx, tx); err != nil {
				log.Printf("⚠️ Failed to create transaction for negotiation: buyer=%s, seller=%s, product=%s, error=%v",
					buyerID, bestSeller.UserID, product, err)
				// Continue - don't fail the negotiation
			} else {
				log.Printf("✅ Created transaction %s for negotiation: buyer=%s, product=%s, amount=Rp %.0f",
					tx.ID, buyerID, product, result.TotalAmount)
			}
		}
	} else {
		result.Success = false
		result.ErrorMessage = "Negosiasi gagal"
	}

	return result
}

type SellerInfo struct {
	UserID      string
	Name        string
	ProductName string
	StockQty    float64
	MinPrice    float64
}

func (n *NegotiationOrchestrator) getDemoSellers(product string) []SellerInfo {
	// Demo sellers for testing
	demoSellers := map[string][]SellerInfo{
		"beras": {
			{UserID: "22222222-2222-2222-2222-222222222222", Name: "Pak Joyo", ProductName: "Beras Premium", StockQty: 500, MinPrice: 11500},
			{UserID: "55555555-5555-5555-5555-555555555555", Name: "Pak Budi", ProductName: "Beras Premium", StockQty: 200, MinPrice: 12000},
		},
		"cabai": {
			{UserID: "33333333-3333-3333-3333-333333333333", Name: "Mang Ujang", ProductName: "Cabai Merah", StockQty: 20, MinPrice: 45000},
		},
		"telur": {
			{UserID: "44444444-4444-4444-4444-444444444444", Name: "Bu Ani", ProductName: "Telur Ayam", StockQty: 100, MinPrice: 2200},
		},
	}

	// Try exact match first
	if sellers, ok := demoSellers[product]; ok {
		return sellers
	}

	// Try partial match
	for key, sellers := range demoSellers {
		if contains(product, key) || contains(key, product) {
			return sellers
		}
	}

	return nil
}

func (n *NegotiationOrchestrator) findBestSeller(sellers []SellerInfo, maxPrice, qty float64) *SellerInfo {
	var best *SellerInfo
	bestPrice := maxPrice + 1

	for i := range sellers {
		s := &sellers[i]
		if s.MinPrice <= maxPrice && s.StockQty >= qty && s.MinPrice < bestPrice {
			best = s
			bestPrice = s.MinPrice
		}
	}

	return best
}

func (n *NegotiationOrchestrator) runNegotiation(result *NegotiationResult, seller *SellerInfo, maxPrice, qty float64) float64 {
	// Simulate negotiation rounds
	currentOffer := maxPrice * 0.9     // Buyer starts at 90% of max
	sellerAsk := seller.MinPrice * 1.1 // Seller starts at 110% of min

	// Round 1: Seller initial offer
	result.Messages = append(result.Messages, NegotiationMessage{
		Role:    "seller_agent",
		Content: fmt.Sprintf("[%s] Stok tersedia %.0f unit. Harga Rp %.0f/unit", seller.Name, seller.StockQty, sellerAsk),
		Time:    time.Now().Format(time.RFC3339),
	})

	// Round 2: Buyer counter
	result.Messages = append(result.Messages, NegotiationMessage{
		Role:    "buyer_agent",
		Content: fmt.Sprintf("Bisa Rp %.0f/unit? Saya ambil %.0f unit", currentOffer, qty),
		Time:    time.Now().Format(time.RFC3339),
	})

	// Round 3: Seller counter
	midPrice := (currentOffer + sellerAsk) / 2
	if midPrice < seller.MinPrice {
		midPrice = seller.MinPrice
	}

	result.Messages = append(result.Messages, NegotiationMessage{
		Role:    "seller_agent",
		Content: fmt.Sprintf("[%s] Untuk %.0f unit, bisa Rp %.0f/unit", seller.Name, qty, midPrice),
		Time:    time.Now().Format(time.RFC3339),
	})

	// Final: Check if deal is possible
	if midPrice <= maxPrice && midPrice >= seller.MinPrice {
		result.Messages = append(result.Messages, NegotiationMessage{
			Role:    "buyer_agent",
			Content: fmt.Sprintf("Deal! Rp %.0f/unit", midPrice),
			Time:    time.Now().Format(time.RFC3339),
		})
		return midPrice
	}

	return 0
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		(len(s) > 0 && len(substr) > 0 && findSubstring(s, substr)))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
