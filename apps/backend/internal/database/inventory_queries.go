package database

import (
	"context"
	"fmt"
	"strings"
)

// GetInventoryByProductSQL gets inventory using SQL query (more reliable than REST API)
func (s *SupabaseClient) GetInventoryByProductSQL(ctx context.Context, userID, productName string) (*Inventory, error) {
	// Use SQL query via RPC or direct SQL execution
	// For now, let's try a simpler approach with exact match

	// Normalize product name for matching
	normalizedProduct := strings.ToLower(strings.TrimSpace(productName))

	// Get all inventory for user and filter in code
	var items []Inventory
	endpoint := fmt.Sprintf("inventory?user_id=eq.%s&select=*", userID)
	err := s.request(ctx, "GET", endpoint, nil, &items)
	if err != nil {
		return nil, err
	}

	// Find matching product (case-insensitive partial match)
	for _, item := range items {
		itemName := strings.ToLower(strings.TrimSpace(item.ProductName))
		if strings.Contains(itemName, normalizedProduct) || strings.Contains(normalizedProduct, itemName) {
			return &item, nil
		}
	}

	return nil, nil
}
