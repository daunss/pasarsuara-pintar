package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/pasarsuara/backend/internal/database"
	"github.com/pasarsuara/backend/internal/integrations"
)

// ShopeeImportHandler handles Shopee product import
type ShopeeImportHandler struct {
	scraper *integrations.ShopeeScraper
	db      *database.SupabaseClient
}

// NewShopeeImportHandler creates a new handler
func NewShopeeImportHandler(db *database.SupabaseClient) *ShopeeImportHandler {
	return &ShopeeImportHandler{
		scraper: integrations.NewShopeeScraper(),
		db:      db,
	}
}

// ShopeeSearchRequest is the request to search a Shopee shop
type ShopeeSearchRequest struct {
	ShopName string `json:"shop_name"`
}

// ShopeeImportRequest is the request to import products
type ShopeeImportRequest struct {
	ShopID int64  `json:"shop_id"`
	UserID string `json:"user_id"`
	Limit  int    `json:"limit,omitempty"` // 0 = all
}

// HandleSearchShop searches for a Shopee shop by name
func (h *ShopeeImportHandler) HandleSearchShop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ShopeeSearchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "Invalid request body",
		})
		return
	}

	if req.ShopName == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "shop_name is required",
		})
		return
	}

	shopInfo, err := h.scraper.SearchShop(r.Context(), req.ShopName)
	if err != nil {
		log.Printf("❌ Shopee search failed: %v", err)
		writeJSON(w, http.StatusNotFound, map[string]any{
			"success": false,
			"error":   fmt.Sprintf("Toko tidak ditemukan: %v", err),
		})
		return
	}

	// Also fetch a preview of products (first 5)
	preview, _ := h.scraper.GetShopProducts(r.Context(), shopInfo.ShopID, 5)

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"shop":    shopInfo,
		"preview": preview,
		"message": fmt.Sprintf("Toko \"%s\" ditemukan dengan %d produk", shopInfo.ShopName, shopInfo.ItemCount),
	})
}

// HandleImportProducts imports products from Shopee into inventory
func (h *ShopeeImportHandler) HandleImportProducts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ShopeeImportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "Invalid request body",
		})
		return
	}

	if req.ShopID == 0 || req.UserID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "shop_id and user_id are required",
		})
		return
	}

	// Fetch products from Shopee
	products, err := h.scraper.GetShopProducts(r.Context(), req.ShopID, req.Limit)
	if err != nil {
		log.Printf("❌ Shopee product fetch failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"success": false,
			"error":   fmt.Sprintf("Gagal mengambil produk: %v", err),
		})
		return
	}

	if len(products) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{
			"success":  true,
			"imported": 0,
			"message":  "Tidak ada produk ditemukan di toko ini",
		})
		return
	}

	// Import into inventory
	imported := 0
	skipped := 0
	errors := []string{}

	for _, p := range products {
		// Determine the sell price (use price or price_min)
		sellPrice := p.Price
		if sellPrice == 0 {
			sellPrice = p.PriceMin
		}

		// Create inventory item
		inv := &database.Inventory{
			UserID:       req.UserID,
			ProductName:  p.Name,
			StockQty:     float64(p.Stock),
			Unit:         "pcs",
			MinSellPrice: sellPrice,
			Description:  fmt.Sprintf("Imported from Shopee | Terjual: %d | Rating: %.1f", p.Sold, p.RatingStar),
		}

		err := h.db.CreateInventory(r.Context(), inv)
		if err != nil {
			if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "conflict") {
				skipped++
			} else {
				errors = append(errors, fmt.Sprintf("%s: %v", p.Name, err))
			}
			continue
		}
		imported++
	}

	log.Printf("✅ Shopee import: %d imported, %d skipped, %d errors", imported, skipped, len(errors))

	writeJSON(w, http.StatusOK, map[string]any{
		"success":  true,
		"imported": imported,
		"skipped":  skipped,
		"total":    len(products),
		"errors":   errors,
		"message":  fmt.Sprintf("Berhasil import %d produk dari Shopee", imported),
	})
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
