package agents

import (
	"fmt"
	"strings"

	"github.com/pasarsuara/backend/internal/ai"
)

// AmbiguityCheck represents missing or unclear information
type AmbiguityCheck struct {
	HasAmbiguity bool
	Missing      []string
	Question     string
	Suggestions  []string
}

// CheckAmbiguity detects incomplete or unclear intent
func CheckAmbiguity(intent *ai.Intent) *AmbiguityCheck {
	check := &AmbiguityCheck{
		HasAmbiguity: false,
		Missing:      []string{},
		Suggestions:  []string{},
	}

	switch intent.Action {
	case "RECORD_SALE":
		return checkSaleAmbiguity(intent)
	case "RECORD_EXPENSE":
		return checkExpenseAmbiguity(intent)
	case "ORDER_RESTOCK":
		return checkRestockAmbiguity(intent)
	case "CHECK_STOCK":
		return checkStockAmbiguity(intent)
	default:
		return check
	}
}

func checkSaleAmbiguity(intent *ai.Intent) *AmbiguityCheck {
	check := &AmbiguityCheck{
		HasAmbiguity: false,
		Missing:      []string{},
	}

	product := getStringEntity(intent.Entities, "product")
	qty := getFloatEntity(intent.Entities, "qty")
	price := getFloatEntity(intent.Entities, "price")

	// Check missing product
	if product == "" {
		check.HasAmbiguity = true
		check.Missing = append(check.Missing, "product")
		check.Question = "Produk apa yang dijual?"
		check.Suggestions = []string{"Nasi Goreng", "Ayam Geprek", "Es Teh"}
		return check
	}

	// Check missing quantity
	if qty == 0 {
		check.HasAmbiguity = true
		check.Missing = append(check.Missing, "qty")
		check.Question = fmt.Sprintf("Berapa porsi %s yang terjual?", product)
		check.Suggestions = []string{"5 porsi", "10 porsi", "15 porsi", "20 porsi"}
		return check
	}

	// Check missing price
	if price == 0 {
		check.HasAmbiguity = true
		check.Missing = append(check.Missing, "price")
		check.Question = fmt.Sprintf("Harga %s berapa per porsi?", product)
		check.Suggestions = []string{"Rp 10.000", "Rp 15.000", "Rp 20.000", "Rp 25.000"}
		return check
	}

	return check
}

func checkExpenseAmbiguity(intent *ai.Intent) *AmbiguityCheck {
	check := &AmbiguityCheck{
		HasAmbiguity: false,
		Missing:      []string{},
	}

	product := getStringEntity(intent.Entities, "product")
	price := getFloatEntity(intent.Entities, "price")

	// Check missing item
	if product == "" {
		check.HasAmbiguity = true
		check.Missing = append(check.Missing, "product")
		check.Question = "Pengeluaran untuk apa?"
		check.Suggestions = []string{"Listrik", "Gas", "Wifi", "Gaji"}
		return check
	}

	// Check missing amount
	if price == 0 {
		check.HasAmbiguity = true
		check.Missing = append(check.Missing, "price")
		check.Question = fmt.Sprintf("Biaya %s berapa?", product)
		check.Suggestions = []string{"Rp 50.000", "Rp 100.000", "Rp 200.000"}
		return check
	}

	return check
}

func checkRestockAmbiguity(intent *ai.Intent) *AmbiguityCheck {
	check := &AmbiguityCheck{
		HasAmbiguity: false,
		Missing:      []string{},
	}

	product := getStringEntity(intent.Entities, "product")
	qty := getFloatEntity(intent.Entities, "qty")
	maxPrice := getFloatEntity(intent.Entities, "max_price")

	// Check missing product
	if product == "" {
		check.HasAmbiguity = true
		check.Missing = append(check.Missing, "product")
		check.Question = "Mau pesan produk apa?"
		check.Suggestions = []string{"Beras", "Minyak Goreng", "Telur", "Gula"}
		return check
	}

	// Check missing quantity
	if qty == 0 {
		check.HasAmbiguity = true
		check.Missing = append(check.Missing, "qty")
		check.Question = fmt.Sprintf("Berapa kg %s yang dibutuhkan?", product)
		check.Suggestions = []string{"25 kg", "50 kg", "100 kg"}
		return check
	}

	// Check missing budget
	if maxPrice == 0 {
		check.HasAmbiguity = true
		check.Missing = append(check.Missing, "max_price")
		check.Question = fmt.Sprintf("Budget maksimal untuk %s berapa per kg?", product)
		check.Suggestions = []string{"Rp 10.000", "Rp 12.000", "Rp 15.000"}
		return check
	}

	return check
}

func checkStockAmbiguity(intent *ai.Intent) *AmbiguityCheck {
	check := &AmbiguityCheck{
		HasAmbiguity: false,
		Missing:      []string{},
	}

	product := getStringEntity(intent.Entities, "product")

	// Check missing product
	if product == "" {
		check.HasAmbiguity = true
		check.Missing = append(check.Missing, "product")
		check.Question = "Mau cek stok produk apa?"
		check.Suggestions = []string{"Beras", "Minyak", "Telur", "Gula"}
		return check
	}

	return check
}

// FormatAmbiguityResponse formats ambiguity check as WhatsApp message
func FormatAmbiguityResponse(check *AmbiguityCheck) string {
	if !check.HasAmbiguity {
		return ""
	}

	msg := check.Question + "\n\n"

	if len(check.Suggestions) > 0 {
		msg += "💡 Contoh:\n"
		for i, suggestion := range check.Suggestions {
			if i >= 4 {
				break // Max 4 suggestions
			}
			msg += fmt.Sprintf("• %s\n", suggestion)
		}
	}

	return msg
}

// FormatAmbiguityButtons formats suggestions as button options
func FormatAmbiguityButtons(check *AmbiguityCheck) []string {
	if !check.HasAmbiguity || len(check.Suggestions) == 0 {
		return []string{}
	}

	buttons := []string{}
	for i, suggestion := range check.Suggestions {
		if i >= 3 {
			break // WhatsApp max 3 buttons
		}
		// Clean up suggestion for button text
		buttonText := strings.ReplaceAll(suggestion, "Rp ", "")
		buttonText = strings.ReplaceAll(buttonText, ".000", "rb")
		buttons = append(buttons, buttonText)
	}

	return buttons
}
