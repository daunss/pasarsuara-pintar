package api

import (
	"encoding/json"
	"net/http"

	"github.com/pasarsuara/backend/internal/agents"
)

// AnalyticsAPI handles analytics endpoints
type AnalyticsAPI struct {
	analyticsAgent *agents.AnalyticsAgent
}

func NewAnalyticsAPI(analyticsAgent *agents.AnalyticsAgent) *AnalyticsAPI {
	return &AnalyticsAPI{
		analyticsAgent: analyticsAgent,
	}
}

// SalesForecastRequest represents forecast request
type SalesForecastRequest struct {
	UserID      string `json:"user_id"`
	ProductName string `json:"product_name"`
	Days        int    `json:"days"`
}

// HandleSalesForecast handles sales forecasting requests
func (api *AnalyticsAPI) HandleSalesForecast(w http.ResponseWriter, r *http.Request) {
	var req SalesForecastRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.Days == 0 {
		req.Days = 7 // Default 7 days
	}

	forecast, err := api.analyticsAgent.ForecastSales(r.Context(), req.UserID, req.ProductName, req.Days)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(forecast)
}

// PriceRecommendationRequest represents price optimization request
type PriceRecommendationRequest struct {
	UserID      string `json:"user_id"`
	ProductName string `json:"product_name"`
}

// HandlePriceRecommendation handles price optimization requests
func (api *AnalyticsAPI) HandlePriceRecommendation(w http.ResponseWriter, r *http.Request) {
	var req PriceRecommendationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	recommendation, err := api.analyticsAgent.RecommendOptimalPrice(r.Context(), req.UserID, req.ProductName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(recommendation)
}

// InventoryOptimizationRequest represents inventory optimization request
type InventoryOptimizationRequest struct {
	UserID string `json:"user_id"`
}

// HandleInventoryOptimization handles inventory optimization requests
func (api *AnalyticsAPI) HandleInventoryOptimization(w http.ResponseWriter, r *http.Request) {
	var req InventoryOptimizationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	recommendations, err := api.analyticsAgent.OptimizeInventory(r.Context(), req.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"recommendations": recommendations,
		"total":           len(recommendations),
	})
}
