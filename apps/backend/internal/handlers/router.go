package handlers

import (
	"context"
	"fmt"
	"strings"

	"github.com/pasarsuara/backend/internal/database"
)

// MessageRouter routes incoming WhatsApp messages to appropriate handlers
type MessageRouter struct {
	db           *database.SupabaseClient
	intentEngine IntentEngineInterface
	contextMgr   ConversationManagerInterface
}

// IntentEngineInterface defines the interface for intent extraction
type IntentEngineInterface interface {
	ExtractIntent(ctx context.Context, message string) (*TransactionIntent, error)
}

// ConversationManagerInterface defines the interface for conversation management
type ConversationManagerInterface interface {
	GetContext(phoneNumber string) (*ConversationContext, bool)
	SetContext(phoneNumber string, context *ConversationContext)
	ClearContext(phoneNumber string)
}

// NewMessageRouter creates a new message router
func NewMessageRouter(db *database.SupabaseClient, intentEngine IntentEngineInterface, contextMgr ConversationManagerInterface) *MessageRouter {
	return &MessageRouter{
		db:           db,
		intentEngine: intentEngine,
		contextMgr:   contextMgr,
	}
}

// RouteMessage routes a message to the appropriate handler
func (r *MessageRouter) RouteMessage(phoneNumber, message string) (string, error) {
	ctx := context.Background()

	// Normalize message
	message = strings.TrimSpace(message)
	if message == "" {
		return "Maaf, pesan kosong. Silakan kirim pesan Anda.", nil
	}

	// 1. Check if user is in registration flow
	if IsInRegistration(phoneNumber) {
		response := HandleRegistration(phoneNumber, message)
		return response, nil
	}

	// 2. Check if message is registration trigger
	if r.isRegistrationMessage(message) {
		response := HandleRegistration(phoneNumber, message)
		return response, nil
	}

	// 3. Check if user is in ambiguity conversation
	if r.isInConversation(phoneNumber) {
		intent, isComplete := ProcessFollowUp(phoneNumber, message)
		if !isComplete {
			// Still need more information
			hasAmbiguity, question := CheckAmbiguity(phoneNumber, intent)
			if hasAmbiguity {
				return question, nil
			}
		}

		// Conversation complete, process transaction
		if intent != nil && intent.IsComplete {
			return r.processCompleteTransaction(ctx, phoneNumber, intent)
		}

		return "Maaf, ada yang salah. Silakan coba lagi.", nil
	}

	// 4. Process as new transaction message
	return r.processTransactionMessage(ctx, phoneNumber, message)
}

// isRegistrationMessage checks if the message is a registration trigger
func (r *MessageRouter) isRegistrationMessage(message string) bool {
	message = strings.ToLower(strings.TrimSpace(message))
	return message == "daftar" || message == "register" || message == "signup"
}

// isInConversation checks if user is in an ongoing conversation
func (r *MessageRouter) isInConversation(phoneNumber string) bool {
	return IsInConversation(phoneNumber)
}

// processTransactionMessage processes a new transaction message
func (r *MessageRouter) processTransactionMessage(ctx context.Context, phoneNumber, message string) (string, error) {
	// Extract intent from message
	intent, err := r.extractIntent(ctx, message)
	if err != nil {
		return fmt.Sprintf("Maaf, gagal memproses pesan: %v", err), err
	}

	// Check for ambiguity
	hasAmbiguity, question := CheckAmbiguity(phoneNumber, intent)
	if hasAmbiguity {
		return question, nil
	}

	// Process complete transaction
	return r.processCompleteTransaction(ctx, phoneNumber, intent)
}

// extractIntent extracts transaction intent from message
func (r *MessageRouter) extractIntent(ctx context.Context, message string) (*TransactionIntent, error) {
	if r.intentEngine == nil {
		// Fallback: simple parsing
		return &TransactionIntent{
			Type:        "SALE",
			Product:     "Unknown",
			Quantity:    1,
			Price:       0,
			TotalAmount: 0,
			IsComplete:  false,
		}, nil
	}

	return r.intentEngine.ExtractIntent(ctx, message)
}

// processCompleteTransaction processes a complete transaction
func (r *MessageRouter) processCompleteTransaction(ctx context.Context, phoneNumber string, intent *TransactionIntent) (string, error) {
	// Auto-categorize if it's an expense or purchase
	category := AutoCategorizeTransaction(intent.Type, intent.Product)

	// Save to database
	if r.db != nil {
		// Get user ID from phone number
		userID, err := r.getUserIDFromPhone(ctx, phoneNumber)
		if err != nil {
			return fmt.Sprintf("Maaf, gagal menyimpan transaksi: %v", err), err
		}

		// Save transaction
		err = r.saveTransaction(ctx, userID, intent, category)
		if err != nil {
			return fmt.Sprintf("Maaf, gagal menyimpan transaksi: %v", err), err
		}
	}

	// Clear conversation context
	ClearConversation(phoneNumber)

	// Generate success response
	return r.generateSuccessResponse(intent, category), nil
}

// getUserIDFromPhone gets user ID from phone number
func (r *MessageRouter) getUserIDFromPhone(ctx context.Context, phoneNumber string) (string, error) {
	// Query database for user
	// This is a placeholder - implement actual query
	return "user-id-placeholder", nil
}

// saveTransaction saves transaction to database
func (r *MessageRouter) saveTransaction(ctx context.Context, userID string, intent *TransactionIntent, category string) error {
	// Save to database
	// This is a placeholder - implement actual save
	fmt.Printf("Saving transaction: UserID=%s, Type=%s, Product=%s, Qty=%.2f, Price=%.2f, Category=%s\n",
		userID, intent.Type, intent.Product, intent.Quantity, intent.Price, category)
	return nil
}

// generateSuccessResponse generates a success response message
func (r *MessageRouter) generateSuccessResponse(intent *TransactionIntent, category string) string {
	var typeEmoji string
	var typeText string

	switch intent.Type {
	case "SALE":
		typeEmoji = "💰"
		typeText = "Penjualan"
	case "PURCHASE":
		typeEmoji = "🛒"
		typeText = "Pembelian"
	case "EXPENSE":
		typeEmoji = "💸"
		typeText = "Pengeluaran"
	default:
		typeEmoji = "📝"
		typeText = "Transaksi"
	}

	response := fmt.Sprintf(`%s %s Berhasil Dicatat!

📦 Produk: %s
🔢 Jumlah: %.0f
💵 Harga: Rp %.0f
💰 Total: Rp %.0f`,
		typeEmoji, typeText,
		intent.Product,
		intent.Quantity,
		intent.Price,
		intent.TotalAmount)

	if category != "" {
		categoryEmoji := GetCategoryEmoji(ExpenseCategory(category))
		categoryDesc := GetCategoryDescription(ExpenseCategory(category))
		response += fmt.Sprintf("\n🏷️ Kategori: %s %s", categoryEmoji, categoryDesc)
	}

	response += "\n\n✅ Data sudah tersimpan di dashboard Anda."

	return response
}

// ValidateMessageContext validates that message context is complete
func ValidateMessageContext(phoneNumber, message string) error {
	if phoneNumber == "" {
		return fmt.Errorf("phone number is required")
	}
	if message == "" {
		return fmt.Errorf("message is required")
	}
	return nil
}
