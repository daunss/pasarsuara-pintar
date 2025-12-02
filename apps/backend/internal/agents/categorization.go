package agents

import (
	"fmt"
	"strings"
)

// ExpenseCategory represents expense categories
type ExpenseCategory string

const (
	CategoryBahanBaku    ExpenseCategory = "BAHAN_BAKU"
	CategoryOperasional  ExpenseCategory = "OPERASIONAL"
	CategoryGaji         ExpenseCategory = "GAJI"
	CategoryTransportasi ExpenseCategory = "TRANSPORTASI"
	CategoryPemasaran    ExpenseCategory = "PEMASARAN"
	CategoryLainnya      ExpenseCategory = "LAINNYA"
)

// CategoryKeywords maps categories to their keywords
var CategoryKeywords = map[ExpenseCategory][]string{
	CategoryBahanBaku: {
		"beras", "minyak", "telur", "cabai", "bawang", "gula", "tepung",
		"daging", "ayam", "ikan", "sayur", "buah", "bumbu", "garam",
		"kecap", "saos", "mentega", "susu", "keju", "roti", "mie",
	},
	CategoryOperasional: {
		"listrik", "air", "gas", "wifi", "internet", "telepon", "pulsa",
		"sewa", "rent", "maintenance", "perbaikan", "service", "cleaning",
		"kebersihan", "sampah", "parkir", "keamanan", "security",
	},
	CategoryGaji: {
		"gaji", "upah", "salary", "wage", "bonus", "thr", "insentif",
		"lembur", "overtime", "komisi", "tunjangan", "allowance",
	},
	CategoryTransportasi: {
		"bensin", "solar", "pertamax", "bbm", "fuel", "ojek", "grab",
		"gojek", "taxi", "angkot", "bus", "parkir", "tol", "kirim",
		"delivery", "ongkir", "shipping",
	},
	CategoryPemasaran: {
		"iklan", "ads", "promosi", "promo", "marketing", "banner",
		"spanduk", "brosur", "flyer", "sosmed", "facebook", "instagram",
		"google", "sponsor", "endorsement",
	},
}

// CategorizeExpense automatically categorizes an expense
func CategorizeExpense(productName string) ExpenseCategory {
	if productName == "" {
		return CategoryLainnya
	}

	// Normalize product name
	normalized := strings.ToLower(strings.TrimSpace(productName))

	// Check each category
	for category, keywords := range CategoryKeywords {
		for _, keyword := range keywords {
			if strings.Contains(normalized, keyword) {
				return category
			}
		}
	}

	// Default to LAINNYA if no match
	return CategoryLainnya
}

// GetCategoryName returns Indonesian name for category
func GetCategoryName(category ExpenseCategory) string {
	names := map[ExpenseCategory]string{
		CategoryBahanBaku:    "Bahan Baku",
		CategoryOperasional:  "Operasional",
		CategoryGaji:         "Gaji & Upah",
		CategoryTransportasi: "Transportasi",
		CategoryPemasaran:    "Pemasaran",
		CategoryLainnya:      "Lainnya",
	}

	if name, ok := names[category]; ok {
		return name
	}
	return "Lainnya"
}

// GetCategoryEmoji returns emoji for category
func GetCategoryEmoji(category ExpenseCategory) string {
	emojis := map[ExpenseCategory]string{
		CategoryBahanBaku:    "🛒",
		CategoryOperasional:  "⚙️",
		CategoryGaji:         "💼",
		CategoryTransportasi: "🚗",
		CategoryPemasaran:    "📢",
		CategoryLainnya:      "📝",
	}

	if emoji, ok := emojis[category]; ok {
		return emoji
	}
	return "📝"
}

// FormatCategoryInfo formats category information for display
func FormatCategoryInfo(category ExpenseCategory) string {
	emoji := GetCategoryEmoji(category)
	name := GetCategoryName(category)
	return fmt.Sprintf("%s %s", emoji, name)
}
