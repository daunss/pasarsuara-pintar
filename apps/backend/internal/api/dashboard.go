package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/pasarsuara/backend/internal/database"
)

// DashboardHandler handles dashboard operations
type DashboardHandler struct {
	db *database.SupabaseClient
}

// DashboardMetrics represents dashboard metrics
type DashboardMetrics struct {
	TodaySales       float64 `json:"today_sales"`
	TodayPurchases   float64 `json:"today_purchases"`
	TodayExpenses    float64 `json:"today_expenses"`
	GrossProfit      float64 `json:"gross_profit"`
	TransactionCount int     `json:"transaction_count"`
	SalesChange      float64 `json:"sales_change"`
	ProfitChange     float64 `json:"profit_change"`
}

// RecentTransaction represents a recent transaction
type RecentTransaction struct {
	ID          string  `json:"id"`
	Type        string  `json:"type"`
	ProductName string  `json:"product_name"`
	Amount      float64 `json:"amount"`
	CreatedAt   string  `json:"created_at"`
}

// InventoryStatus represents inventory status
type InventoryStatus struct {
	TotalProducts   int `json:"total_products"`
	LowStockCount   int `json:"low_stock_count"`
	OutOfStockCount int `json:"out_of_stock_count"`
}

func NewDashboardHandler(db *database.SupabaseClient) *DashboardHandler {
	return &DashboardHandler{
		db: db,
	}
}

// HandleGetMetrics returns dashboard metrics
func (d *DashboardHandler) HandleGetMetrics(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context (set by auth middleware)
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "User ID required", http.StatusBadRequest)
		return
	}

	// Get date parameter (default to today)
	dateStr := r.URL.Query().Get("date")
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	ctx := context.Background()

	// Calculate metrics
	metrics, err := d.calculateMetrics(ctx, userID, dateStr)
	if err != nil {
		log.Printf("Error calculating metrics: %v", err)
		http.Error(w, "Failed to calculate metrics", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metrics)
}

// HandleGetRecentTransactions returns recent transactions
func (d *DashboardHandler) HandleGetRecentTransactions(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "User ID required", http.StatusBadRequest)
		return
	}

	limit := 10 // Default limit

	ctx := context.Background()

	// Get recent transactions
	transactions, err := d.db.GetRecentTransactions(ctx, userID, limit)
	if err != nil {
		log.Printf("Error getting recent transactions: %v", err)
		http.Error(w, "Failed to get transactions", http.StatusInternalServerError)
		return
	}

	// Convert to response format
	recentTxns := make([]RecentTransaction, len(transactions))
	for i, tx := range transactions {
		recentTxns[i] = RecentTransaction{
			ID:          tx.ID,
			Type:        tx.Type,
			ProductName: tx.ProductName,
			Amount:      tx.TotalAmount,
			CreatedAt:   tx.CreatedAt,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(recentTxns)
}

// HandleGetInventoryStatus returns inventory status
func (d *DashboardHandler) HandleGetInventoryStatus(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "User ID required", http.StatusBadRequest)
		return
	}

	ctx := context.Background()

	// Get inventory status
	status, err := d.calculateInventoryStatus(ctx, userID)
	if err != nil {
		log.Printf("Error calculating inventory status: %v", err)
		http.Error(w, "Failed to get inventory status", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// calculateMetrics calculates dashboard metrics for a specific date
func (d *DashboardHandler) calculateMetrics(ctx context.Context, userID, date string) (*DashboardMetrics, error) {
	// Get today's transactions
	todayTxns, err := d.db.GetTransactionsByDate(ctx, userID, date)
	if err != nil {
		return nil, err
	}

	// Calculate totals
	var todaySales, todayPurchases, todayExpenses float64
	transactionCount := len(todayTxns)

	for _, tx := range todayTxns {
		switch tx.Type {
		case "SALE":
			todaySales += tx.TotalAmount
		case "PURCHASE":
			todayPurchases += tx.TotalAmount
		case "EXPENSE":
			todayExpenses += tx.TotalAmount
		}
	}

	grossProfit := todaySales - todayPurchases - todayExpenses

	// Calculate yesterday's metrics for comparison
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	yesterdayTxns, err := d.db.GetTransactionsByDate(ctx, userID, yesterday)
	if err != nil {
		// If error, just set changes to 0
		return &DashboardMetrics{
			TodaySales:       todaySales,
			TodayPurchases:   todayPurchases,
			TodayExpenses:    todayExpenses,
			GrossProfit:      grossProfit,
			TransactionCount: transactionCount,
			SalesChange:      0,
			ProfitChange:     0,
		}, nil
	}

	var yesterdaySales float64
	var yesterdayProfit float64
	for _, tx := range yesterdayTxns {
		if tx.Type == "SALE" {
			yesterdaySales += tx.TotalAmount
		}
	}
	yesterdayProfit = yesterdaySales // Simplified

	// Calculate percentage changes
	salesChange := calculatePercentageChange(yesterdaySales, todaySales)
	profitChange := calculatePercentageChange(yesterdayProfit, grossProfit)

	return &DashboardMetrics{
		TodaySales:       todaySales,
		TodayPurchases:   todayPurchases,
		TodayExpenses:    todayExpenses,
		GrossProfit:      grossProfit,
		TransactionCount: transactionCount,
		SalesChange:      salesChange,
		ProfitChange:     profitChange,
	}, nil
}

// calculateInventoryStatus calculates inventory status
func (d *DashboardHandler) calculateInventoryStatus(ctx context.Context, userID string) (*InventoryStatus, error) {
	// Get all inventory items
	inventory, err := d.db.GetInventoryByUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	totalProducts := len(inventory)
	lowStockCount := 0
	outOfStockCount := 0

	// Low stock threshold (can be configurable per user)
	lowStockThreshold := 10.0

	for _, item := range inventory {
		if item.StockQty == 0 {
			outOfStockCount++
		} else if item.StockQty < lowStockThreshold {
			lowStockCount++
		}
	}

	return &InventoryStatus{
		TotalProducts:   totalProducts,
		LowStockCount:   lowStockCount,
		OutOfStockCount: outOfStockCount,
	}, nil
}

// calculatePercentageChange calculates percentage change between two values
func calculatePercentageChange(old, new float64) float64 {
	if old == 0 {
		if new == 0 {
			return 0
		}
		return 100 // 100% increase from 0
	}
	return ((new - old) / old) * 100
}
