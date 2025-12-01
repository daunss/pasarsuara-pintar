package api

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/pasarsuara/backend/internal/agents"
)

// CatalogHandler handles catalog and promo generation
type CatalogHandler struct {
	promoAgent *agents.PromoAgent
}

func NewCatalogHandler(promoAgent *agents.PromoAgent) *CatalogHandler {
	return &CatalogHandler{
		promoAgent: promoAgent,
	}
}

// GeneratePromoRequest is the request body for promo generation
type GeneratePromoRequest struct {
	ProductName string  `json:"product_name"`
	Price       float64 `json:"price"`
	Description string  `json:"description"`
}

// GenerateBundleRequest is the request body for bundle promo
type GenerateBundleRequest struct {
	Products    []string `json:"products"`
	BundlePrice float64  `json:"bundle_price"`
}

// HandleGeneratePromo generates promotional content for a single product
func (h *CatalogHandler) HandleGeneratePromo(w http.ResponseWriter, r *http.Request) {
	var req GeneratePromoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.ProductName == "" {
		http.Error(w, "product_name is required", http.StatusBadRequest)
		return
	}

	log.Printf("📝 Generating promo for: %s", req.ProductName)

	promo, err := h.promoAgent.GeneratePromo(r.Context(), req.ProductName, req.Price, req.Description)
	if err != nil {
		log.Printf("❌ Promo generation failed: %v", err)
		http.Error(w, "Failed to generate promo", http.StatusInternalServerError)
		return
	}

	// Add formatted versions
	response := map[string]any{
		"promo":              promo,
		"whatsapp_format":    h.promoAgent.FormatForWhatsApp(promo),
		"marketplace_format": h.promoAgent.FormatForMarketplace(promo),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleGenerateCatalog generates a full catalog
func (h *CatalogHandler) HandleGenerateCatalog(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		userID = "11111111-1111-1111-1111-111111111111" // Demo user
	}

	log.Printf("📚 Generating catalog for user: %s", userID)

	catalog, err := h.promoAgent.GenerateCatalog(r.Context(), userID)
	if err != nil {
		log.Printf("❌ Catalog generation failed: %v", err)
		http.Error(w, "Failed to generate catalog", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"user_id": userID,
		"catalog": catalog,
		"count":   len(catalog),
	})
}

// HandleGenerateBundle generates a bundle promotion
func (h *CatalogHandler) HandleGenerateBundle(w http.ResponseWriter, r *http.Request) {
	var req GenerateBundleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if len(req.Products) == 0 {
		http.Error(w, "products array is required", http.StatusBadRequest)
		return
	}

	log.Printf("🎁 Generating bundle promo for %d products", len(req.Products))

	promo, err := h.promoAgent.GenerateBundlePromo(r.Context(), req.Products, req.BundlePrice)
	if err != nil {
		log.Printf("❌ Bundle promo generation failed: %v", err)
		http.Error(w, "Failed to generate bundle promo", http.StatusInternalServerError)
		return
	}

	response := map[string]any{
		"promo":           promo,
		"whatsapp_format": h.promoAgent.FormatForWhatsApp(promo),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
