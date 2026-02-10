package database

import (
	"context"
	"fmt"
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

	endpoint := fmt.Sprintf("supplier_offers?owner_user_id=eq.%s&is_active=eq.true", ownerUserID)
	if product != "" {
		endpoint += fmt.Sprintf("&product_name=ilike.%%%s%%", product)
	}
	if maxPrice > 0 {
		endpoint += fmt.Sprintf("&price=lte.%f", maxPrice)
	}
	if city != "" {
		endpoint += fmt.Sprintf("&city=ilike.%%%s%%", city)
	}
	endpoint += "&order=price.asc"

	err := s.request(ctx, "GET", endpoint, nil, &offers)
	return offers, err
}
