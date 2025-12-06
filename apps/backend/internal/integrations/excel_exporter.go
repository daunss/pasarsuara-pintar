package integrations

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/pasarsuara/backend/internal/database"
	"github.com/xuri/excelize/v2"
)

// ExcelExporter handles advanced Excel export functionality
type ExcelExporter struct {
	db *database.SupabaseClient
}

func NewExcelExporter(db *database.SupabaseClient) *ExcelExporter {
	return &ExcelExporter{db: db}
}

// ExportRequest represents export configuration
type ExportRequest struct {
	UserID    string `json:"user_id"`
	Type      string `json:"type"` // "transactions", "inventory", "financial_report"
	StartDate string `json:"start_date,omitempty"`
	EndDate   string `json:"end_date,omitempty"`
}

// ExportResponse represents export result
type ExportResponse struct {
	FileName    string `json:"file_name"`
	DownloadURL string `json:"download_url"`
	RecordCount int    `json:"record_count"`
	GeneratedAt string `json:"generated_at"`
}

// ExportTransactions creates a professional Excel report
func (e *ExcelExporter) ExportTransactions(ctx context.Context, req *ExportRequest) (*ExportResponse, error) {
	log.Printf("📊 Exporting transactions for user %s", req.UserID)

	f := excelize.NewFile()
	defer f.Close()

	// Create sheets
	f.NewSheet("Summary")
	f.NewSheet("Transactions")
	f.NewSheet("Analytics")
	f.DeleteSheet("Sheet1")

	// Get transactions
	endDate := time.Now().Format("2006-01-02T15:04:05Z")
	startDate := time.Now().AddDate(0, 0, -30).Format("2006-01-02T15:04:05Z")

	if req.StartDate != "" {
		startDate = req.StartDate
	}
	if req.EndDate != "" {
		endDate = req.EndDate
	}

	transactions, err := e.db.GetTransactionsByDateRange(ctx, req.UserID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get transactions: %w", err)
	}

	// Create Summary Sheet
	e.createSummarySheet(f, transactions)
	e.createTransactionsSheet(f, transactions)
	e.createAnalyticsSheet(f, transactions)

	// Save file
	fileName := fmt.Sprintf("transactions_%s_%s.xlsx", req.UserID[:8], time.Now().Format("20060102_150405"))
	filePath := fmt.Sprintf("/tmp/%s", fileName)

	err = f.SaveAs(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	return &ExportResponse{
		FileName:    fileName,
		DownloadURL: fmt.Sprintf("/api/exports/download/%s", fileName),
		RecordCount: len(transactions),
		GeneratedAt: time.Now().Format(time.RFC3339),
	}, nil
}

func (e *ExcelExporter) createSummarySheet(f *excelize.File, transactions []database.Transaction) {
	sheet := "Summary"

	// Headers
	f.SetCellValue(sheet, "A1", "📊 RINGKASAN TRANSAKSI")
	f.SetCellValue(sheet, "A3", "Periode")
	f.SetCellValue(sheet, "B3", fmt.Sprintf("%s - %s", time.Now().AddDate(0, 0, -30).Format("02/01/2006"), time.Now().Format("02/01/2006")))

	// Calculate summary
	totalSales := 0.0
	totalPurchases := 0.0
	totalExpenses := 0.0

	for _, tx := range transactions {
		switch tx.Type {
		case "SALE":
			totalSales += tx.TotalAmount
		case "PURCHASE":
			totalPurchases += tx.TotalAmount
		case "EXPENSE":
			totalExpenses += tx.TotalAmount
		}
	}

	profit := totalSales - totalPurchases - totalExpenses

	// Set data
	f.SetCellValue(sheet, "A5", "Total Penjualan")
	f.SetCellValue(sheet, "B5", fmt.Sprintf("Rp %.0f", totalSales))
	f.SetCellValue(sheet, "A6", "Total Pembelian")
	f.SetCellValue(sheet, "B6", fmt.Sprintf("Rp %.0f", totalPurchases))
	f.SetCellValue(sheet, "A7", "Total Pengeluaran")
	f.SetCellValue(sheet, "B7", fmt.Sprintf("Rp %.0f", totalExpenses))
	f.SetCellValue(sheet, "A8", "Keuntungan Bersih")
	f.SetCellValue(sheet, "B8", fmt.Sprintf("Rp %.0f", profit))
	f.SetCellValue(sheet, "A9", "Jumlah Transaksi")
	f.SetCellValue(sheet, "B9", len(transactions))

	// Style
	style, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 14},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#4472C4"}, Pattern: 1},
	})
	f.SetCellStyle(sheet, "A1", "B1", style)
}

func (e *ExcelExporter) createTransactionsSheet(f *excelize.File, transactions []database.Transaction) {
	sheet := "Transactions"

	// Headers
	headers := []string{"Tanggal", "Tipe", "Produk", "Jumlah", "Harga Satuan", "Total", "Keterangan"}
	for i, header := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		f.SetCellValue(sheet, cell, header)
	}

	// Data
	for i, tx := range transactions {
		row := i + 2
		date := tx.CreatedAt[:10]
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), date)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), tx.Type)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), tx.ProductName)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), tx.Qty)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), fmt.Sprintf("Rp %.0f", tx.PricePerUnit))
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), fmt.Sprintf("Rp %.0f", tx.TotalAmount))
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), "")
	}

	// Style headers
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#D9E1F2"}, Pattern: 1},
	})
	f.SetCellStyle(sheet, "A1", "G1", headerStyle)
}

func (e *ExcelExporter) createAnalyticsSheet(f *excelize.File, transactions []database.Transaction) {
	sheet := "Analytics"

	// Product performance
	productStats := make(map[string]struct {
		qty     float64
		revenue float64
		count   int
	})

	for _, tx := range transactions {
		if tx.Type == "SALE" {
			stats := productStats[tx.ProductName]
			stats.qty += tx.Qty
			stats.revenue += tx.TotalAmount
			stats.count++
			productStats[tx.ProductName] = stats
		}
	}

	// Headers
	f.SetCellValue(sheet, "A1", "📈 ANALISIS PRODUK")
	f.SetCellValue(sheet, "A3", "Produk")
	f.SetCellValue(sheet, "B3", "Total Terjual")
	f.SetCellValue(sheet, "C3", "Total Revenue")
	f.SetCellValue(sheet, "D3", "Rata-rata per Transaksi")
	f.SetCellValue(sheet, "E3", "Jumlah Transaksi")

	// Data
	row := 4
	for product, stats := range productStats {
		avgPerTx := stats.qty / float64(stats.count)
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), product)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), fmt.Sprintf("%.1f", stats.qty))
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), fmt.Sprintf("Rp %.0f", stats.revenue))
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), fmt.Sprintf("%.1f", avgPerTx))
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), stats.count)
		row++
	}
}
