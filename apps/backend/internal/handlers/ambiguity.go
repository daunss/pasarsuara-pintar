package handlers

import (
	"fmt"
	"strings"
)

// TransactionIntent represents extracted transaction information
type TransactionIntent struct {
	Type        string // "SALE", "PURCHASE", "EXPENSE"
	Product     string
	Quantity    float64
	Price       float64
	TotalAmount float64
	IsComplete  bool
	MissingInfo []string
}

// ConversationContext tracks ongoing conversation
type ConversationContext struct {
	PhoneNumber     string
	Intent          *TransactionIntent
	WaitingFor      string // "product", "quantity", "price"
	LastQuestion    string
	PreviousMessage string
}

// In-memory conversation contexts (in production, use Redis)
var conversationContexts = make(map[string]*ConversationContext)

// CheckAmbiguity checks if transaction intent is complete
func CheckAmbiguity(phoneNumber string, intent *TransactionIntent) (bool, string) {
	missing := []string{}

	// Check for missing information
	if intent.Product == "" {
		missing = append(missing, "product")
	}
	if intent.Quantity == 0 {
		missing = append(missing, "quantity")
	}
	if intent.Price == 0 && intent.TotalAmount == 0 {
		missing = append(missing, "price")
	}

	if len(missing) > 0 {
		intent.MissingInfo = missing
		intent.IsComplete = false

		// Store context
		conversationContexts[phoneNumber] = &ConversationContext{
			PhoneNumber: phoneNumber,
			Intent:      intent,
			WaitingFor:  missing[0],
		}

		// Ask for missing information
		return true, AskForMissingInfo(intent, missing[0])
	}

	intent.IsComplete = true
	return false, ""
}

// AskForMissingInfo generates appropriate question
func AskForMissingInfo(intent *TransactionIntent, missing string) string {
	switch missing {
	case "product":
		if intent.Type == "SALE" {
			return "Produk apa yang dijual? 🛍️\n\nContoh: Nasi goreng, Beras, Minyak goreng"
		} else if intent.Type == "PURCHASE" {
			return "Beli produk apa? 🛒\n\nContoh: Beras, Minyak, Telur"
		} else {
			return "Pengeluaran untuk apa? 💸\n\nContoh: Listrik, Gas, Bensin"
		}

	case "quantity":
		if intent.Product != "" {
			return fmt.Sprintf("Berapa %s?\n\n[5] [10] [15] [20]\n\nAtau ketik jumlahnya:", intent.Product)
		}
		return "Berapa jumlahnya?\n\nContoh: 10, 5 kg, 3 liter"

	case "price":
		if intent.Product != "" && intent.Quantity > 0 {
			return fmt.Sprintf("Harga %s %.0f unit berapa?\n\n💡 Contoh:\n• Rp 10.000\n• 10rb\n• 10000",
				intent.Product, intent.Quantity)
		} else if intent.Product != "" {
			return fmt.Sprintf("Harga %s berapa per unit?\n\nContoh: 15rb, Rp 15.000", intent.Product)
		}
		return "Harganya berapa?\n\nContoh: 15rb, Rp 15.000"

	default:
		return "Maaf, ada informasi yang kurang. Bisa diulang?"
	}
}

// ProcessFollowUp processes follow-up messages in conversation
func ProcessFollowUp(phoneNumber, message string) (*TransactionIntent, bool) {
	context, exists := conversationContexts[phoneNumber]
	if !exists {
		return nil, false
	}

	message = strings.ToLower(strings.TrimSpace(message))
	intent := context.Intent

	// Process based on what we're waiting for
	switch context.WaitingFor {
	case "product":
		intent.Product = ExtractProduct(message)
		if intent.Product != "" {
			// Check if we still need more info
			if intent.Quantity == 0 {
				context.WaitingFor = "quantity"
				return intent, false // Not complete yet
			} else if intent.Price == 0 {
				context.WaitingFor = "price"
				return intent, false
			}
		}

	case "quantity":
		qty := ExtractQuantity(message)
		if qty > 0 {
			intent.Quantity = qty
			// Check if we still need price
			if intent.Price == 0 && intent.TotalAmount == 0 {
				context.WaitingFor = "price"
				return intent, false
			}
		}

	case "price":
		price := ExtractPrice(message)
		if price > 0 {
			intent.Price = price
			// Calculate total if we have quantity
			if intent.Quantity > 0 {
				intent.TotalAmount = intent.Quantity * intent.Price
			} else {
				intent.TotalAmount = price
			}
		}
	}

	// Check if complete now
	if intent.Product != "" && intent.Quantity > 0 && (intent.Price > 0 || intent.TotalAmount > 0) {
		intent.IsComplete = true
		delete(conversationContexts, phoneNumber) // Clean up
		return intent, true
	}

	// Still missing info, ask next question
	hasAmbiguity, question := CheckAmbiguity(phoneNumber, intent)
	if hasAmbiguity {
		context.LastQuestion = question
	}

	return intent, false
}

// ExtractProduct extracts product name from message
func ExtractProduct(message string) string {
	// Simple extraction - in production, use NLP
	message = strings.TrimSpace(message)

	// Remove common words
	removeWords := []string{"beli", "jual", "laku", "tadi", "kemarin"}
	for _, word := range removeWords {
		message = strings.ReplaceAll(message, word, "")
	}

	return strings.TrimSpace(message)
}

// ExtractQuantity extracts quantity from message
func ExtractQuantity(message string) float64 {
	// Simple extraction - in production, use better parsing
	var qty float64

	// Try to find numbers
	fmt.Sscanf(message, "%f", &qty)

	return qty
}

// ExtractPrice extracts price from message
func ExtractPrice(message string) float64 {
	// Remove common price indicators
	message = strings.ReplaceAll(message, "rp", "")
	message = strings.ReplaceAll(message, "rb", "000")
	message = strings.ReplaceAll(message, "ribu", "000")
	message = strings.ReplaceAll(message, ".", "")
	message = strings.ReplaceAll(message, ",", "")
	message = strings.TrimSpace(message)

	var price float64
	fmt.Sscanf(message, "%f", &price)

	return price
}

// GenerateButtonMessage generates WhatsApp button message
func GenerateButtonMessage(question string, options []string) string {
	// WhatsApp button format
	message := question + "\n\n"

	for i, option := range options {
		message += fmt.Sprintf("[%d] %s\n", i+1, option)
	}

	message += "\nKetik angka atau nama pilihan Anda."

	return message
}

// GetCommonQuantities returns common quantity options
func GetCommonQuantities(product string) []string {
	// Common quantities based on product type
	return []string{"5", "10", "15", "20", "25"}
}

// IsInConversation checks if user is in ongoing conversation
func IsInConversation(phoneNumber string) bool {
	_, exists := conversationContexts[phoneNumber]
	return exists
}

// ClearConversation clears conversation context
func ClearConversation(phoneNumber string) {
	delete(conversationContexts, phoneNumber)
}
