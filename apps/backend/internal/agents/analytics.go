package agents

import (
	"context"
	"fmt"
	"log"
	"math"
	"sort"
	"time"

	"github.com/pasarsuara/backend/internal/database"
)

// AnalyticsAgent provides advanced AI-powered business analytics
type AnalyticsAgent struct {
	db *database.SupabaseClient
}

func NewAnalyticsAgent(db *database.SupabaseClient) *AnalyticsAgent {
	return &AnalyticsAgent{db: db}
}

// SalesForecast represents sales prediction
type SalesForecast struct {
	ProductName       string            `json:"product_name"`
	CurrentDailySales float64           `json:"current_daily_sales"`
	PredictedSales    []DailyPrediction `json:"predicted_sales"`
	Confidence        float64           `json:"confidence"`
	Trend             string            `json:"trend"` // "INCREASING", "STABLE", "DECREASING"
	Recommendation    string            `json:"recommendation"`
}

type DailyPrediction struct {
	Date             string  `json:"date"`
	PredictedQty     float64 `json:"predicted_qty"`
	PredictedRevenue float64 `json:"predicted_revenue"`
}

// PriceRecommendation represents optimal pricing suggestion
type PriceRecommendation struct {
	ProductName      string  `json:"product_name"`
	CurrentPrice     float64 `json:"current_price"`
	RecommendedPrice float64 `json:"recommended_price"`
	ExpectedProfit   float64 `json:"expected_profit"`
	PriceChange      float64 `json:"price_change_percent"`
	Reasoning        string  `json:"reasoning"`
	Confidence       float64 `json:"confidence"`
}

// InventoryRecommendation represents smart reorder suggestion
type InventoryRecommendation struct {
	ProductName       string  `json:"product_name"`
	CurrentStock      float64 `json:"current_stock"`
	DailyUsage        float64 `json:"daily_usage"`
	DaysUntilStockout int     `json:"days_until_stockout"`
	ReorderPoint      float64 `json:"reorder_point"`
	ReorderQuantity   float64 `json:"reorder_quantity"`
	Urgency           string  `json:"urgency"` // "CRITICAL", "HIGH", "MEDIUM", "LOW"
	Recommendation    string  `json:"recommendation"`
}

// ForecastSales predicts future sales based on historical data
func (a *AnalyticsAgent) ForecastSales(ctx context.Context, userID string, productName string, days int) (*SalesForecast, error) {
	log.Printf("📊 Forecasting sales for %s (%d days)", productName, days)

	// Get historical sales data (last 30 days)
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -30)

	transactions, err := a.getTransactionHistory(ctx, userID, productName, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get transaction history: %w", err)
	}

	if len(transactions) == 0 {
		return &SalesForecast{
			ProductName:    productName,
			Confidence:     0,
			Trend:          "UNKNOWN",
			Recommendation: "Belum ada data penjualan untuk produk ini",
		}, nil
	}

	// Calculate daily sales
	dailySales := a.calculateDailySales(transactions)
	avgDailySales := a.calculateAverage(dailySales)
	trend := a.calculateTrend(dailySales)

	// Generate predictions
	predictions := make([]DailyPrediction, days)
	avgPrice := a.calculateAveragePrice(transactions)

	for i := 0; i < days; i++ {
		date := time.Now().AddDate(0, 0, i+1)
		predictedQty := a.predictSalesForDay(avgDailySales, trend, i)

		predictions[i] = DailyPrediction{
			Date:             date.Format("2006-01-02"),
			PredictedQty:     math.Round(predictedQty*100) / 100,
			PredictedRevenue: math.Round(predictedQty * avgPrice),
		}
	}

	// Calculate confidence based on data consistency
	confidence := a.calculateConfidence(dailySales)

	// Generate recommendation
	recommendation := a.generateSalesRecommendation(trend, avgDailySales, predictions)

	return &SalesForecast{
		ProductName:       productName,
		CurrentDailySales: math.Round(avgDailySales*100) / 100,
		PredictedSales:    predictions,
		Confidence:        math.Round(confidence*100) / 100,
		Trend:             trend,
		Recommendation:    recommendation,
	}, nil
}

// RecommendOptimalPrice suggests the best price for maximum profit
func (a *AnalyticsAgent) RecommendOptimalPrice(ctx context.Context, userID string, productName string) (*PriceRecommendation, error) {
	log.Printf("💰 Calculating optimal price for %s", productName)

	// Get historical sales at different prices
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -60) // Last 60 days

	transactions, err := a.getTransactionHistory(ctx, userID, productName, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get transaction history: %w", err)
	}

	if len(transactions) == 0 {
		return &PriceRecommendation{
			ProductName: productName,
			Confidence:  0,
			Reasoning:   "Belum ada data penjualan untuk analisis harga",
		}, nil
	}

	// Analyze price-demand relationship
	pricePoints := a.analyzePriceDemand(transactions)
	currentPrice := a.calculateAveragePrice(transactions)

	// Calculate optimal price (maximize revenue)
	optimalPrice := a.calculateOptimalPrice(pricePoints, currentPrice)
	expectedProfit := a.estimateProfit(pricePoints, optimalPrice)
	priceChange := ((optimalPrice - currentPrice) / currentPrice) * 100

	// Generate reasoning
	reasoning := a.generatePriceReasoning(currentPrice, optimalPrice, priceChange, pricePoints)
	confidence := a.calculatePriceConfidence(pricePoints)

	return &PriceRecommendation{
		ProductName:      productName,
		CurrentPrice:     math.Round(currentPrice),
		RecommendedPrice: math.Round(optimalPrice),
		ExpectedProfit:   math.Round(expectedProfit),
		PriceChange:      math.Round(priceChange*100) / 100,
		Reasoning:        reasoning,
		Confidence:       math.Round(confidence*100) / 100,
	}, nil
}

// OptimizeInventory provides smart reorder recommendations
func (a *AnalyticsAgent) OptimizeInventory(ctx context.Context, userID string) ([]InventoryRecommendation, error) {
	log.Printf("📦 Optimizing inventory for user %s", userID)

	// Get current inventory
	inventory, err := a.db.GetInventory(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get inventory: %w", err)
	}

	recommendations := make([]InventoryRecommendation, 0)

	for _, item := range inventory {
		// Calculate daily usage (last 30 days)
		endDate := time.Now()
		startDate := endDate.AddDate(0, 0, -30)

		transactions, err := a.getTransactionHistory(ctx, userID, item.ProductName, startDate, endDate)
		if err != nil {
			continue
		}

		if len(transactions) == 0 {
			continue // Skip items with no sales history
		}

		totalSold := 0.0
		for _, tx := range transactions {
			if tx.Type == "SALE" {
				totalSold += tx.Qty
			}
		}

		dailyUsage := totalSold / 30.0
		daysUntilStockout := 0
		if dailyUsage > 0 {
			daysUntilStockout = int(item.StockQty / dailyUsage)
		}

		// Calculate reorder point (7 days buffer)
		reorderPoint := dailyUsage * 7
		reorderQuantity := dailyUsage * 14 // 2 weeks supply

		// Determine urgency
		urgency := "LOW"
		if daysUntilStockout <= 3 {
			urgency = "CRITICAL"
		} else if daysUntilStockout <= 7 {
			urgency = "HIGH"
		} else if daysUntilStockout <= 14 {
			urgency = "MEDIUM"
		}

		// Generate recommendation
		recommendation := a.generateInventoryRecommendation(item.ProductName, daysUntilStockout, urgency, reorderQuantity)

		recommendations = append(recommendations, InventoryRecommendation{
			ProductName:       item.ProductName,
			CurrentStock:      math.Round(item.StockQty*100) / 100,
			DailyUsage:        math.Round(dailyUsage*100) / 100,
			DaysUntilStockout: daysUntilStockout,
			ReorderPoint:      math.Round(reorderPoint*100) / 100,
			ReorderQuantity:   math.Round(reorderQuantity*100) / 100,
			Urgency:           urgency,
			Recommendation:    recommendation,
		})
	}

	// Sort by urgency
	sort.Slice(recommendations, func(i, j int) bool {
		urgencyOrder := map[string]int{"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
		return urgencyOrder[recommendations[i].Urgency] < urgencyOrder[recommendations[j].Urgency]
	})

	return recommendations, nil
}

// Helper functions

func (a *AnalyticsAgent) getTransactionHistory(ctx context.Context, userID, productName string, startDate, endDate time.Time) ([]*database.Transaction, error) {
	if a.db == nil {
		return []*database.Transaction{}, nil
	}

	start := startDate.Format("2006-01-02T15:04:05Z")
	end := endDate.Format("2006-01-02T15:04:05Z")

	transactions, err := a.db.GetTransactionsByProduct(ctx, userID, productName, start, end)
	if err != nil {
		return nil, err
	}

	// Convert to pointer slice
	result := make([]*database.Transaction, len(transactions))
	for i := range transactions {
		result[i] = &transactions[i]
	}

	return result, nil
}

func (a *AnalyticsAgent) calculateDailySales(transactions []*database.Transaction) []float64 {
	dailyMap := make(map[string]float64)

	for _, tx := range transactions {
		if tx.Type == "SALE" {
			date := tx.CreatedAt[:10] // Get date part
			dailyMap[date] += tx.Qty
		}
	}

	sales := make([]float64, 0, len(dailyMap))
	for _, qty := range dailyMap {
		sales = append(sales, qty)
	}

	return sales
}

func (a *AnalyticsAgent) calculateAverage(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}

	sum := 0.0
	for _, v := range values {
		sum += v
	}
	return sum / float64(len(values))
}

func (a *AnalyticsAgent) calculateTrend(dailySales []float64) string {
	if len(dailySales) < 2 {
		return "STABLE"
	}

	// Simple linear regression slope
	n := float64(len(dailySales))
	sumX, sumY, sumXY, sumX2 := 0.0, 0.0, 0.0, 0.0

	for i, y := range dailySales {
		x := float64(i)
		sumX += x
		sumY += y
		sumXY += x * y
		sumX2 += x * x
	}

	slope := (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX)

	if slope > 0.5 {
		return "INCREASING"
	} else if slope < -0.5 {
		return "DECREASING"
	}
	return "STABLE"
}

func (a *AnalyticsAgent) predictSalesForDay(avgSales float64, trend string, dayOffset int) float64 {
	prediction := avgSales

	// Apply trend adjustment
	trendFactor := 0.0
	switch trend {
	case "INCREASING":
		trendFactor = 0.05 // 5% increase per day
	case "DECREASING":
		trendFactor = -0.03 // 3% decrease per day
	}

	prediction = prediction * (1 + trendFactor*float64(dayOffset))

	if prediction < 0 {
		prediction = 0
	}

	return prediction
}

func (a *AnalyticsAgent) calculateAveragePrice(transactions []*database.Transaction) float64 {
	if len(transactions) == 0 {
		return 0
	}

	totalRevenue := 0.0
	totalQty := 0.0

	for _, tx := range transactions {
		if tx.Type == "SALE" {
			totalRevenue += tx.TotalAmount
			totalQty += tx.Qty
		}
	}

	if totalQty == 0 {
		return 0
	}

	return totalRevenue / totalQty
}

func (a *AnalyticsAgent) calculateConfidence(dailySales []float64) float64 {
	if len(dailySales) < 3 {
		return 0.5 // Low confidence with little data
	}

	// Calculate coefficient of variation (lower = more consistent = higher confidence)
	avg := a.calculateAverage(dailySales)
	if avg == 0 {
		return 0.5
	}

	variance := 0.0
	for _, v := range dailySales {
		diff := v - avg
		variance += diff * diff
	}
	variance /= float64(len(dailySales))
	stdDev := math.Sqrt(variance)

	cv := stdDev / avg
	confidence := 1.0 / (1.0 + cv) // Convert to 0-1 scale

	return math.Min(confidence, 0.95) // Cap at 95%
}

func (a *AnalyticsAgent) generateSalesRecommendation(trend string, avgSales float64, predictions []DailyPrediction) string {
	switch trend {
	case "INCREASING":
		return fmt.Sprintf("📈 Penjualan meningkat! Rata-rata %.0f unit/hari. Pertimbangkan tambah stok dan promosi lebih agresif.", avgSales)
	case "DECREASING":
		return fmt.Sprintf("📉 Penjualan menurun. Rata-rata %.0f unit/hari. Pertimbangkan promo atau evaluasi harga.", avgSales)
	default:
		return fmt.Sprintf("📊 Penjualan stabil di %.0f unit/hari. Pertahankan strategi saat ini.", avgSales)
	}
}

type pricePoint struct {
	price  float64
	demand float64
}

func (a *AnalyticsAgent) analyzePriceDemand(transactions []*database.Transaction) []pricePoint {
	priceMap := make(map[float64]float64)

	for _, tx := range transactions {
		if tx.Type == "SALE" && tx.PricePerUnit > 0 {
			priceMap[tx.PricePerUnit] += tx.Qty
		}
	}

	points := make([]pricePoint, 0, len(priceMap))
	for price, demand := range priceMap {
		points = append(points, pricePoint{price: price, demand: demand})
	}

	return points
}

func (a *AnalyticsAgent) calculateOptimalPrice(pricePoints []pricePoint, currentPrice float64) float64 {
	if len(pricePoints) == 0 {
		return currentPrice
	}

	// Find price that maximizes revenue
	maxRevenue := 0.0
	optimalPrice := currentPrice

	for _, point := range pricePoints {
		revenue := point.price * point.demand
		if revenue > maxRevenue {
			maxRevenue = revenue
			optimalPrice = point.price
		}
	}

	// Don't recommend drastic changes (max 20% change)
	maxChange := currentPrice * 0.20
	if math.Abs(optimalPrice-currentPrice) > maxChange {
		if optimalPrice > currentPrice {
			optimalPrice = currentPrice + maxChange
		} else {
			optimalPrice = currentPrice - maxChange
		}
	}

	return optimalPrice
}

func (a *AnalyticsAgent) estimateProfit(pricePoints []pricePoint, optimalPrice float64) float64 {
	// Estimate demand at optimal price
	estimatedDemand := 0.0
	for _, point := range pricePoints {
		if math.Abs(point.price-optimalPrice) < optimalPrice*0.1 {
			estimatedDemand += point.demand
		}
	}

	if estimatedDemand == 0 && len(pricePoints) > 0 {
		estimatedDemand = pricePoints[0].demand
	}

	return optimalPrice * estimatedDemand
}

func (a *AnalyticsAgent) generatePriceReasoning(current, optimal, changePercent float64, points []pricePoint) string {
	if math.Abs(changePercent) < 2 {
		return fmt.Sprintf("Harga saat ini (Rp %.0f) sudah optimal. Pertahankan harga ini.", current)
	}

	if changePercent > 0 {
		return fmt.Sprintf("Naikkan harga %.1f%% ke Rp %.0f. Data menunjukkan demand masih tinggi di harga ini.", changePercent, optimal)
	}

	return fmt.Sprintf("Turunkan harga %.1f%% ke Rp %.0f untuk meningkatkan volume penjualan.", math.Abs(changePercent), optimal)
}

func (a *AnalyticsAgent) calculatePriceConfidence(pricePoints []pricePoint) float64 {
	if len(pricePoints) < 3 {
		return 0.6 // Medium confidence
	}
	return 0.85 // High confidence with good data
}

func (a *AnalyticsAgent) generateInventoryRecommendation(productName string, daysLeft int, urgency string, reorderQty float64) string {
	switch urgency {
	case "CRITICAL":
		return fmt.Sprintf("🚨 URGENT! Stok %s tinggal %d hari. Restock SEKARANG minimal %.0f unit!", productName, daysLeft, reorderQty)
	case "HIGH":
		return fmt.Sprintf("⚠️ Stok %s menipis (%d hari). Segera restock %.0f unit minggu ini.", productName, daysLeft, reorderQty)
	case "MEDIUM":
		return fmt.Sprintf("📦 Stok %s cukup untuk %d hari. Rencanakan restock %.0f unit.", productName, daysLeft, reorderQty)
	default:
		return fmt.Sprintf("✅ Stok %s aman untuk %d hari.", productName, daysLeft)
	}
}
