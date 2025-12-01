package agents

import (
	"context"
	"testing"

	"github.com/pasarsuara/backend/internal/ai"
)

func TestNegotiationOrchestrator_StartNegotiation(t *testing.T) {
	orchestrator := NewNegotiationOrchestrator(nil, nil) // No DB for unit test

	tests := []struct {
		name        string
		intent      *ai.Intent
		wantSuccess bool
		wantProduct string
	}{
		{
			name: "negotiate beras within budget",
			intent: &ai.Intent{
				Action: "ORDER_RESTOCK",
				Entities: map[string]any{
					"product":   "beras",
					"qty":       float64(25),
					"max_price": float64(12000),
				},
				RawText: "cari beras 25 kg maksimal 12 ribu",
			},
			wantSuccess: true,
			wantProduct: "beras",
		},
		{
			name: "negotiate cabai",
			intent: &ai.Intent{
				Action: "ORDER_RESTOCK",
				Entities: map[string]any{
					"product":   "cabai",
					"qty":       float64(5),
					"max_price": float64(50000),
				},
				RawText: "cari cabai 5 kg",
			},
			wantSuccess: true,
			wantProduct: "cabai",
		},
		{
			name: "negotiate unknown product",
			intent: &ai.Intent{
				Action: "ORDER_RESTOCK",
				Entities: map[string]any{
					"product":   "durian",
					"qty":       float64(10),
					"max_price": float64(100000),
				},
				RawText: "cari durian 10 buah",
			},
			wantSuccess: false,
			wantProduct: "durian",
		},
		{
			name: "negotiate with low budget",
			intent: &ai.Intent{
				Action: "ORDER_RESTOCK",
				Entities: map[string]any{
					"product":   "beras",
					"qty":       float64(25),
					"max_price": float64(5000), // Too low
				},
				RawText: "cari beras 25 kg maksimal 5 ribu",
			},
			wantSuccess: false,
			wantProduct: "beras",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := orchestrator.StartNegotiation(context.Background(), "test-buyer", tt.intent)

			if result.Success != tt.wantSuccess {
				t.Errorf("StartNegotiation() success = %v, want %v", result.Success, tt.wantSuccess)
			}

			if result.ProductName != tt.wantProduct {
				t.Errorf("StartNegotiation() product = %v, want %v", result.ProductName, tt.wantProduct)
			}

			// Check that messages were generated
			if len(result.Messages) == 0 {
				t.Error("StartNegotiation() should generate messages")
			}
		})
	}
}

func TestNegotiationOrchestrator_FindBestSeller(t *testing.T) {
	orchestrator := NewNegotiationOrchestrator(nil, nil)

	sellers := []SellerInfo{
		{UserID: "1", Name: "Seller A", MinPrice: 12000, StockQty: 100},
		{UserID: "2", Name: "Seller B", MinPrice: 11500, StockQty: 50},
		{UserID: "3", Name: "Seller C", MinPrice: 11000, StockQty: 200},
	}

	best := orchestrator.findBestSeller(sellers, 12000, 25)

	if best == nil {
		t.Fatal("findBestSeller() should return a seller")
	}

	if best.MinPrice != 11000 {
		t.Errorf("findBestSeller() should return cheapest seller, got price %v", best.MinPrice)
	}
}
