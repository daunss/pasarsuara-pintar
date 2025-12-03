package handlers

import (
	"context"
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
	CategoryPeralatan    ExpenseCategory = "PERALATAN"
	CategoryLainnya      ExpenseCategory = "LAINNYA"
)

// Category keywords mapping
var categoryKeywords = map[ExpenseCategory][]string{
	CategoryBahanBaku: {
		"beras", "minyak", "telur", "cabai", "gula", "garam",
		"tepung", "daging", "ayam", "ikan", "sayur", "buah",
		"bumbu", "kecap", "saos", "mentega", "susu", "keju",
	},
	CategoryOperasional: {
		"listrik", "air", "gas", "wifi", "internet", "telepon",
		"sewa", "rent", "token", "pulsa", "pdam", "pln",
	},
	CategoryGaji: {
		"gaji", "upah", "salary", "bonus", "thr", "lembur",
		"insentif", "komisi",
	},
	CategoryTransportasi: {
		"bensin", "solar", "pertamax", "ojek", "grab", "gojek",
		"taxi", "parkir", "tol", "angkot", "bus",
	},
	CategoryPeralatan: {
		"piring", "sendok", "garpu", "gelas", "kompor", "kulkas",
		"freezer", "etalase", "meja", "kursi", "rak", "lemari",
		"pisau", "wajan", "panci",
	},
}

// CategorizeExpense categorizes an expense based on product name
func CategorizeExpense(productName string) ExpenseCategory {
	productLower := strings.ToLower(productName)

	// Try keyword matching first
	for category, keywords := range categoryKeywords {
		for _, keyword := range keywords {
			if strings.Contains(productLower, keyword) {
				return category
			}
		}
	}

	// If no match, use AI categorization
	return CategorizeWithAI(productName)
}

// CategorizeWithAI uses Gemini AI to categorize expense
func CategorizeWithAI(productName string) ExpenseCategory {
	prompt := fmt.Sprintf(`Kategorikan produk "%s" ke salah satu kategori berikut:

BAHAN_BAKU - Bahan mentah untuk produksi (beras, minyak, telur, sayur, dll)
OPERASIONAL - Biaya operasional (listrik, air, gas, wifi, sewa, dll)
GAJI - Gaji dan upah karyawan
TRANSPORTASI - Biaya transportasi (bensin, ojek, parkir, dll)
PERALATAN - Peralatan dan perlengkapan usaha
LAINNYA - Kategori lain yang tidak masuk di atas

Jawab HANYA dengan nama kategori (contoh: BAHAN_BAKU).
Jangan tambahkan penjelasan lain.`, productName)

	// Call Gemini API
	response, err := CallGeminiAPI(context.Background(), prompt)
	if err != nil {
		fmt.Printf("AI categorization error: %v\n", err)
		return CategoryLainnya
	}

	// Parse response
	category := strings.ToUpper(strings.TrimSpace(response))

	switch category {
	case "BAHAN_BAKU":
		return CategoryBahanBaku
	case "OPERASIONAL":
		return CategoryOperasional
	case "GAJI":
		return CategoryGaji
	case "TRANSPORTASI":
		return CategoryTransportasi
	case "PERALATAN":
		return CategoryPeralatan
	default:
		return CategoryLainnya
	}
}

// GeminiClient interface for dependency injection
var geminiClient GeminiClientInterface

// GeminiClientInterface defines the interface for Gemini operations
type GeminiClientInterface interface {
	Categorize(ctx context.Context, productName string) (string, error)
}

// SetGeminiClient sets the Gemini client for categorization handler
func SetGeminiClient(client GeminiClientInterface) {
	geminiClient = client
}

// CallGeminiAPI calls Gemini API for categorization
func CallGeminiAPI(ctx context.Context, prompt string) (string, error) {
	if geminiClient == nil {
		fmt.Println("Warning: Gemini client not initialized, using fallback categorization")
		return "LAINNYA", nil
	}

	// Extract product name from prompt (simple extraction)
	// The prompt format is: 'Kategorikan produk "PRODUCT_NAME" ke salah satu...'
	productName := extractProductNameFromPrompt(prompt)
	if productName == "" {
		return "LAINNYA", fmt.Errorf("failed to extract product name from prompt")
	}

	// Call Gemini API
	response, err := geminiClient.Categorize(ctx, productName)
	if err != nil {
		fmt.Printf("Gemini API error: %v\n", err)
		return "LAINNYA", err
	}

	return response, nil
}

// extractProductNameFromPrompt extracts product name from the categorization prompt
func extractProductNameFromPrompt(prompt string) string {
	// Find text between quotes
	start := strings.Index(prompt, `"`)
	if start == -1 {
		return ""
	}
	end := strings.Index(prompt[start+1:], `"`)
	if end == -1 {
		return ""
	}
	return prompt[start+1 : start+1+end]
}

// GetCategoryDescription returns human-readable category description
func GetCategoryDescription(category ExpenseCategory) string {
	descriptions := map[ExpenseCategory]string{
		CategoryBahanBaku:    "Bahan Baku",
		CategoryOperasional:  "Operasional",
		CategoryGaji:         "Gaji & Upah",
		CategoryTransportasi: "Transportasi",
		CategoryPeralatan:    "Peralatan",
		CategoryLainnya:      "Lainnya",
	}

	return descriptions[category]
}

// GetCategoryEmoji returns emoji for category
func GetCategoryEmoji(category ExpenseCategory) string {
	emojis := map[ExpenseCategory]string{
		CategoryBahanBaku:    "🥘",
		CategoryOperasional:  "⚡",
		CategoryGaji:         "💰",
		CategoryTransportasi: "🚗",
		CategoryPeralatan:    "🔧",
		CategoryLainnya:      "📦",
	}

	return emojis[category]
}

// AutoCategorizeTransaction automatically categorizes a transaction
func AutoCategorizeTransaction(txType, productName string) string {
	// Only categorize expenses and purchases
	if txType != "EXPENSE" && txType != "PURCHASE" {
		return ""
	}

	category := CategorizeExpense(productName)
	return string(category)
}

// GetCategoryStats returns statistics by category
type CategoryStats struct {
	Category    ExpenseCategory
	TotalAmount float64
	Count       int
	Percentage  float64
}

// CalculateCategoryBreakdown calculates expense breakdown by category
func CalculateCategoryBreakdown(transactions []Transaction) []CategoryStats {
	categoryTotals := make(map[ExpenseCategory]float64)
	categoryCounts := make(map[ExpenseCategory]int)
	var totalExpenses float64

	// Calculate totals per category
	for _, tx := range transactions {
		if tx.Type == "EXPENSE" || tx.Type == "PURCHASE" {
			category := ExpenseCategory(tx.Category)
			if category == "" {
				category = CategorizeExpense(tx.ProductName)
			}

			categoryTotals[category] += tx.TotalAmount
			categoryCounts[category]++
			totalExpenses += tx.TotalAmount
		}
	}

	// Build stats
	var stats []CategoryStats
	for category, total := range categoryTotals {
		percentage := 0.0
		if totalExpenses > 0 {
			percentage = (total / totalExpenses) * 100
		}

		stats = append(stats, CategoryStats{
			Category:    category,
			TotalAmount: total,
			Count:       categoryCounts[category],
			Percentage:  percentage,
		})
	}

	return stats
}

// Transaction represents a transaction (simplified)
type Transaction struct {
	Type        string
	ProductName string
	TotalAmount float64
	Category    string
}

// SuggestBudget suggests budget allocation based on historical data
func SuggestBudget(stats []CategoryStats) map[ExpenseCategory]float64 {
	budget := make(map[ExpenseCategory]float64)

	// Calculate average spending per category
	for _, stat := range stats {
		// Suggest 10% buffer on average spending
		budget[stat.Category] = stat.TotalAmount * 1.1
	}

	return budget
}

// GetCategoryInsights provides insights about spending patterns
func GetCategoryInsights(stats []CategoryStats) string {
	if len(stats) == 0 {
		return "Belum ada data pengeluaran untuk dianalisis."
	}

	// Find highest spending category
	var highest CategoryStats
	for _, stat := range stats {
		if stat.TotalAmount > highest.TotalAmount {
			highest = stat
		}
	}

	emoji := GetCategoryEmoji(highest.Category)
	desc := GetCategoryDescription(highest.Category)

	return fmt.Sprintf(`📊 Insight Pengeluaran:

%s %s adalah kategori pengeluaran terbesar Anda:
• Total: Rp %.0f (%.1f%%)
• Jumlah transaksi: %d

💡 Tips: Coba cari supplier dengan harga lebih baik untuk kategori ini.`,
		emoji, desc, highest.TotalAmount, highest.Percentage, highest.Count)
}
