package agents

import (
	"testing"

	"github.com/pasarsuara/backend/internal/database"
)

func TestFormatProductList(t *testing.T) {
	agent := NewCatalogAgent(nil)

	// Test empty catalog
	empty := agent.FormatProductList([]database.ProductCatalog{})
	if empty == "" {
		t.Error("Empty catalog should return message")
	}

	// Test with products
	products := []database.ProductCatalog{
		{
			ProductName:  "Nasi Goreng",
			Category:     "Makanan",
			DefaultPrice: 15000,
			DefaultUnit:  "porsi",
		},
		{
			ProductName:  "Es Teh",
			Category:     "Minuman",
			DefaultPrice: 5000,
			DefaultUnit:  "gelas",
		},
		{
			ProductName:  "Kerupuk",
			Category:     "Makanan",
			DefaultPrice: 2000,
			DefaultUnit:  "bungkus",
		},
	}

	result := agent.FormatProductList(products)
	if result == "" {
		t.Error("Product list should not be empty")
	}

	// Check if categories are present
	if !contains(result, "Makanan") {
		t.Error("Should contain Makanan category")
	}
	if !contains(result, "Minuman") {
		t.Error("Should contain Minuman category")
	}

	// Check if products are present
	if !contains(result, "Nasi Goreng") {
		t.Error("Should contain Nasi Goreng")
	}
	if !contains(result, "Es Teh") {
		t.Error("Should contain Es Teh")
	}

	t.Logf("Product list:\n%s", result)
}
