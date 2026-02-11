package database

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"strings"
)

// SupplierOffer represents a supplier price offer for a product.
type SupplierOffer struct {
	ID           string  `json:"id,omitempty"`
	OwnerUserID  string  `json:"owner_user_id"`
	SupplierName string  `json:"supplier_name"`
	SupplierPhone string `json:"supplier_phone"`
	City         string  `json:"city,omitempty"`
	ProductName  string  `json:"product_name"`
	Unit         string  `json:"unit,omitempty"`
	Price        float64 `json:"price"`
	MinQty       float64 `json:"min_qty,omitempty"`
	MaxQty       float64 `json:"max_qty,omitempty"`
	StockQty     float64 `json:"stock_qty,omitempty"`
	IsActive     bool    `json:"is_active"`
	CreatedAt    string  `json:"created_at,omitempty"`
	UpdatedAt    string  `json:"updated_at,omitempty"`
}

// CreateSupplierOffer inserts a new supplier offer.
func (s *SupabaseClient) CreateSupplierOffer(ctx context.Context, offer *SupplierOffer) error {
	var result []SupplierOffer
	err := s.request(ctx, "POST", "supplier_offers", offer, &result)
	if err != nil {
		return err
	}
	if len(result) > 0 {
		*offer = result[0]
	}
	return nil
}

// GetSupplierOffers finds matching offers for a user request.
func (s *SupabaseClient) GetSupplierOffers(ctx context.Context, ownerUserID, product string, maxPrice float64, city string) ([]SupplierOffer, error) {
	var offers []SupplierOffer

	product = strings.TrimSpace(product)
	city = strings.TrimSpace(city)

	log.Printf("🔍 GetSupplierOffers: userID=%s product=%q maxPrice=%.0f city=%q", ownerUserID, product, maxPrice, city)

	endpoint := fmt.Sprintf("supplier_offers?owner_user_id=eq.%s&is_active=eq.true", ownerUserID)
	if product != "" {
		endpoint += "&product_name=ilike." + url.QueryEscape("%"+product+"%")
	}
	if maxPrice > 0 {
		endpoint += fmt.Sprintf("&price=lte.%.0f", maxPrice)
	}
	if city != "" {
		endpoint += "&city=ilike." + url.QueryEscape("%"+city+"%")
	}
	endpoint += "&order=price.asc"

	log.Printf("🔍 Supplier offers endpoint: %s", endpoint)

	err := s.request(ctx, "GET", endpoint, nil, &offers)
	if err != nil {
		log.Printf("❌ GetSupplierOffers error: %v", err)
		return nil, err
	}

	log.Printf("✅ GetSupplierOffers found %d offers", len(offers))
	return offers, nil
}
