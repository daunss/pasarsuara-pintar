package agents

import (
	"context"
	"testing"

	"github.com/pasarsuara/backend/internal/ai"
)

func TestFinanceAgent_RecordSale(t *testing.T) {
	agent := NewFinanceAgent(nil) // No DB for unit test

	tests := []struct {
		name     string
		intent   *ai.Intent
		wantType string
		wantQty  float64
	}{
		{
			name: "record nasi rames sale",
			intent: &ai.Intent{
				Action: "RECORD_SALE",
				Entities: map[string]any{
					"product": "nasi rames",
					"qty":     float64(10),
					"price":   float64(12000),
				},
				RawText: "laku nasi rames 10 porsi",
			},
			wantType: "SALE",
			wantQty:  10,
		},
		{
			name: "record bakso sale with Javanese",
			intent: &ai.Intent{
				Action: "RECORD_SALE",
				Entities: map[string]any{
					"product": "bakso",
					"qty":     float64(5),
					"price":   float64(15000),
				},
				RawText: "payu bakso limang mangkok",
			},
			wantType: "SALE",
			wantQty:  5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tx, err := agent.RecordSale(context.Background(), "test-user", tt.intent)
			if err != nil {
				t.Errorf("RecordSale() error = %v", err)
				return
			}
			if tx.Type != tt.wantType {
				t.Errorf("RecordSale() type = %v, want %v", tx.Type, tt.wantType)
			}
			if tx.Qty != tt.wantQty {
				t.Errorf("RecordSale() qty = %v, want %v", tx.Qty, tt.wantQty)
			}
		})
	}
}

func TestFinanceAgent_RecordExpense(t *testing.T) {
	agent := NewFinanceAgent(nil)

	intent := &ai.Intent{
		Action: "RECORD_EXPENSE",
		Entities: map[string]any{
			"product": "gas LPG",
			"qty":     float64(2),
			"price":   float64(22000),
		},
		RawText: "beli gas 2 tabung",
	}

	tx, err := agent.RecordExpense(context.Background(), "test-user", intent)
	if err != nil {
		t.Errorf("RecordExpense() error = %v", err)
		return
	}

	if tx.Type != "EXPENSE" {
		t.Errorf("RecordExpense() type = %v, want EXPENSE", tx.Type)
	}

	expectedTotal := float64(44000)
	if tx.TotalAmount != expectedTotal {
		t.Errorf("RecordExpense() total = %v, want %v", tx.TotalAmount, expectedTotal)
	}
}
