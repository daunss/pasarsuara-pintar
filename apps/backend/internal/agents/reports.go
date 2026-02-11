package agents

import (
	"context"
	"fmt"
	"time"

	"github.com/pasarsuara/backend/internal/database"
)

// ReportAgent generates financial reports
type ReportAgent struct {
	db *database.SupabaseClient
}

// DailyReport represents a daily financial summary
type DailyReport struct {
	Date             string
	TotalSales       float64
	TotalPurchases   float64
	TotalExpenses    float64
	GrossProfit      float64
	NetProfit        float64
	TransactionCount int
	TopProducts      []ProductSummary
}

// ProductSummary represents product sales summary
type ProductSummary struct {
	ProductName string
	Quantity    float64
	Revenue     float64
}

func NewReportAgent(db *database.SupabaseClient) *ReportAgent {
	return &ReportAgent{db: db}
}

// GenerateDailyReport generates report for today
func (r *ReportAgent) GenerateDailyReport(ctx context.Context, userID string) (*DailyReport, error) {
	today := time.Now().Format("2006-01-02")
	return r.GenerateReportForDate(ctx, userID, today)
}

// GenerateWeeklyReport generates report for this week
func (r *ReportAgent) GenerateWeeklyReport(ctx context.Context, userID string) (*DailyReport, error) {
	// Get start of week (Monday)
	now := time.Now()
	weekday := int(now.Weekday())
	if weekday == 0 {
		weekday = 7 // Sunday = 7
	}
	startOfWeek := now.AddDate(0, 0, -(weekday - 1))

	return r.GenerateReportForDateRange(ctx, userID, startOfWeek.Format("2006-01-02"), now.Format("2006-01-02"))
}

// GenerateMonthlyReport generates report for this month
func (r *ReportAgent) GenerateMonthlyReport(ctx context.Context, userID string) (*DailyReport, error) {
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	return r.GenerateReportForDateRange(ctx, userID, startOfMonth.Format("2006-01-02"), now.Format("2006-01-02"))
}

// GenerateReportForDate generates report for specific date
func (r *ReportAgent) GenerateReportForDate(ctx context.Context, userID, date string) (*DailyReport, error) {
	return r.GenerateReportForDateRange(ctx, userID, date, date)
}

// GenerateReportForDateRange generates report for date range
func (r *ReportAgent) GenerateReportForDateRange(ctx context.Context, userID, startDate, endDate string) (*DailyReport, error) {
	if r.db == nil {
		// Return demo data
		return &DailyReport{
			Date:             startDate,
			TotalSales:       450000,
			TotalPurchases:   300000,
			TotalExpenses:    50000,
			GrossProfit:      150000,
			NetProfit:        100000,
			TransactionCount: 15,
			TopProducts: []ProductSummary{
				{ProductName: "Nasi Goreng", Quantity: 15, Revenue: 225000},
				{ProductName: "Ayam Geprek", Quantity: 8, Revenue: 160000},
				{ProductName: "Es Teh", Quantity: 20, Revenue: 60000},
			},
		}, nil
	}

	// Query real data from database
	startDateTime := startDate + "T00:00:00Z"
	endDateTime := endDate + "T23:59:59Z"
	transactions, err := r.db.GetTransactionsByDateRange(ctx, userID, startDateTime, endDateTime)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch transactions: %w", err)
	}

	report := &DailyReport{
		Date:             startDate,
		TransactionCount: len(transactions),
	}

	// Aggregate by type and track product performance
	productMap := make(map[string]*ProductSummary)

	for _, tx := range transactions {
		switch tx.Type {
		case "SALE":
			report.TotalSales += tx.TotalAmount
			// Track product performance for sales
			key := tx.ProductName
			if ps, exists := productMap[key]; exists {
				ps.Quantity += tx.Qty
				ps.Revenue += tx.TotalAmount
			} else {
				productMap[key] = &ProductSummary{
					ProductName: tx.ProductName,
					Quantity:    tx.Qty,
					Revenue:     tx.TotalAmount,
				}
			}
		case "PURCHASE":
			report.TotalPurchases += tx.TotalAmount
		case "EXPENSE":
			report.TotalExpenses += tx.TotalAmount
		}
	}

	report.GrossProfit = report.TotalSales - report.TotalPurchases
	report.NetProfit = report.GrossProfit - report.TotalExpenses

	// Convert product map to sorted slice (top products by revenue)
	for _, ps := range productMap {
		report.TopProducts = append(report.TopProducts, *ps)
	}
	// Sort by revenue descending
	for i := 0; i < len(report.TopProducts); i++ {
		for j := i + 1; j < len(report.TopProducts); j++ {
			if report.TopProducts[j].Revenue > report.TopProducts[i].Revenue {
				report.TopProducts[i], report.TopProducts[j] = report.TopProducts[j], report.TopProducts[i]
			}
		}
	}

	return report, nil
}

// FormatDailyReport formats report for WhatsApp
func (r *ReportAgent) FormatDailyReport(report *DailyReport) string {
	dateStr := report.Date
	if report.Date == time.Now().Format("2006-01-02") {
		dateStr = "Hari Ini"
	}

	msg := fmt.Sprintf("📊 *Laporan %s*\n", dateStr)
	msg += fmt.Sprintf("📅 %s\n\n", report.Date)

	msg += "💰 *Ringkasan Keuangan*\n"
	msg += fmt.Sprintf("├ Penjualan: Rp %s\n", formatCurrency(report.TotalSales))
	msg += fmt.Sprintf("├ Pembelian: Rp %s\n", formatCurrency(report.TotalPurchases))
	msg += fmt.Sprintf("├ Pengeluaran: Rp %s\n", formatCurrency(report.TotalExpenses))
	msg += "├─────────────────\n"
	msg += fmt.Sprintf("├ Laba Kotor: Rp %s\n", formatCurrency(report.GrossProfit))
	msg += fmt.Sprintf("└ Laba Bersih: Rp %s\n\n", formatCurrency(report.NetProfit))

	if report.NetProfit > 0 {
		msg += "📈 Profit positif! Pertahankan! 💪\n\n"
	} else if report.NetProfit < 0 {
		msg += "📉 Rugi hari ini. Evaluasi pengeluaran ya! 🤔\n\n"
	}

	msg += fmt.Sprintf("📦 *Total Transaksi:* %d\n\n", report.TransactionCount)

	if len(report.TopProducts) > 0 {
		msg += "🏆 *Produk Terlaris:*\n"
		for i, product := range report.TopProducts {
			if i >= 5 {
				break // Max 5 products
			}
			msg += fmt.Sprintf("%d. %s - %.0f unit (Rp %s)\n",
				i+1, product.ProductName, product.Quantity, formatCurrency(product.Revenue))
		}
	}

	return msg
}

// FormatWeeklyReport formats weekly report
func (r *ReportAgent) FormatWeeklyReport(report *DailyReport) string {
	msg := "📊 *Laporan Minggu Ini*\n\n"

	msg += "💰 *Ringkasan Keuangan*\n"
	msg += fmt.Sprintf("├ Penjualan: Rp %s\n", formatCurrency(report.TotalSales))
	msg += fmt.Sprintf("├ Pembelian: Rp %s\n", formatCurrency(report.TotalPurchases))
	msg += fmt.Sprintf("├ Pengeluaran: Rp %s\n", formatCurrency(report.TotalExpenses))
	msg += "├─────────────────\n"
	msg += fmt.Sprintf("└ Laba Bersih: Rp %s\n\n", formatCurrency(report.NetProfit))

	msg += fmt.Sprintf("📦 *Total Transaksi:* %d\n\n", report.TransactionCount)

	if len(report.TopProducts) > 0 {
		msg += "🏆 *Produk Terlaris:*\n"
		for i, product := range report.TopProducts {
			if i >= 5 {
				break
			}
			msg += fmt.Sprintf("%d. %s - %.0f unit\n", i+1, product.ProductName, product.Quantity)
		}
	}

	return msg
}

// FormatMonthlyReport formats monthly report
func (r *ReportAgent) FormatMonthlyReport(report *DailyReport) string {
	now := time.Now()
	monthName := []string{"", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
		"Juli", "Agustus", "September", "Oktober", "November", "Desember"}

	msg := fmt.Sprintf("📊 *Laporan Bulan %s %d*\n\n", monthName[now.Month()], now.Year())

	msg += "💰 *Ringkasan Keuangan*\n"
	msg += fmt.Sprintf("├ Penjualan: Rp %s\n", formatCurrency(report.TotalSales))
	msg += fmt.Sprintf("├ Pembelian: Rp %s\n", formatCurrency(report.TotalPurchases))
	msg += fmt.Sprintf("├ Pengeluaran: Rp %s\n", formatCurrency(report.TotalExpenses))
	msg += "├─────────────────\n"
	msg += fmt.Sprintf("└ Laba Bersih: Rp %s\n\n", formatCurrency(report.NetProfit))

	msg += fmt.Sprintf("📦 *Total Transaksi:* %d\n", report.TransactionCount)

	// Calculate daily average
	daysInMonth := now.Day()
	avgDaily := report.NetProfit / float64(daysInMonth)
	msg += fmt.Sprintf("📊 *Rata-rata/hari:* Rp %s\n\n", formatCurrency(avgDaily))

	if len(report.TopProducts) > 0 {
		msg += "🏆 *Produk Terlaris:*\n"
		for i, product := range report.TopProducts {
			if i >= 5 {
				break
			}
			msg += fmt.Sprintf("%d. %s - %.0f unit\n", i+1, product.ProductName, product.Quantity)
		}
	}

	return msg
}

func formatCurrency(amount float64) string {
	// Format with thousand separator
	if amount < 0 {
		return fmt.Sprintf("(%.0f)", -amount)
	}

	str := fmt.Sprintf("%.0f", amount)

	// Add thousand separator
	n := len(str)
	if n <= 3 {
		return str
	}

	result := ""
	for i, c := range str {
		if i > 0 && (n-i)%3 == 0 {
			result += "."
		}
		result += string(c)
	}

	return result
}
