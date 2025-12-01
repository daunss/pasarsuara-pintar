package ai

import (
	"testing"
)

func TestIntent_EntityHelpers(t *testing.T) {
	intent := &Intent{
		Action: "ORDER_RESTOCK",
		Entities: map[string]any{
			"product":   "beras",
			"qty":       float64(25),
			"max_price": float64(12000),
			"unit":      "kg",
		},
		Sentiment: "neutral",
		Language:  "id",
		RawText:   "cari beras 25 kg maksimal 12 ribu",
	}

	// Test string entity
	product, ok := intent.Entities["product"].(string)
	if !ok || product != "beras" {
		t.Errorf("Expected product 'beras', got %v", product)
	}

	// Test numeric entity
	qty, ok := intent.Entities["qty"].(float64)
	if !ok || qty != 25 {
		t.Errorf("Expected qty 25, got %v", qty)
	}

	// Test max_price
	maxPrice, ok := intent.Entities["max_price"].(float64)
	if !ok || maxPrice != 12000 {
		t.Errorf("Expected max_price 12000, got %v", maxPrice)
	}
}

func TestIntentEngine_GenerateResponse(t *testing.T) {
	engine := NewIntentEngine("", "", "")

	tests := []struct {
		name   string
		intent *Intent
		want   string // substring to check
	}{
		{
			name: "greeting response",
			intent: &Intent{
				Action:   "GREETING",
				Entities: map[string]any{},
			},
			want: "Halo",
		},
		{
			name: "order restock response",
			intent: &Intent{
				Action: "ORDER_RESTOCK",
				Entities: map[string]any{
					"product":   "beras",
					"qty":       float64(25),
					"max_price": float64(12000),
				},
			},
			want: "restock",
		},
		{
			name: "record sale response",
			intent: &Intent{
				Action: "RECORD_SALE",
				Entities: map[string]any{
					"product": "nasi",
					"qty":     float64(10),
					"price":   float64(12000),
				},
			},
			want: "tercatat",
		},
		{
			name: "unknown intent response",
			intent: &Intent{
				Action:   "UNKNOWN",
				Entities: map[string]any{},
			},
			want: "belum mengerti",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := engine.GenerateResponse(tt.intent)
			if !containsSubstring(response, tt.want) {
				t.Errorf("GenerateResponse() = %v, want substring %v", response, tt.want)
			}
		})
	}
}

func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
