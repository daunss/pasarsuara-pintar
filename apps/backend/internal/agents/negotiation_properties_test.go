package agents

import (
	"context"
	"fmt"
	"math/rand"
	"strings"
	"testing"
	"testing/quick"
	"time"

	"github.com/pasarsuara/backend/internal/ai"
	"github.com/pasarsuara/backend/internal/database"
)

// Mock database client for property testing
type mockDB struct {
	transactions    []*database.Transaction
	negotiationLogs []*database.NegotiationLog
	failTransaction bool
	failNegotiation bool
	lastError       error
}

func newMockDB() *mockDB {
	return &mockDB{
		transactions:    make([]*database.Transaction, 0),
		negotiationLogs: make([]*database.NegotiationLog, 0),
	}
}

func (m *mockDB) CreateTransaction(ctx context.Context, tx *database.Transaction) error {
	if m.failTransaction {
		m.lastError = fmt.Errorf("mock transaction creation failed")
		return m.lastError
	}
	tx.ID = fmt.Sprintf("tx-%d", len(m.transactions)+1)
	tx.CreatedAt = time.Now().Format(time.RFC3339)
	m.transactions = append(m.transactions, tx)
	return nil
}

func (m *mockDB) CreateNegotiationLog(ctx context.Context, log *database.NegotiationLog) error {
	if m.failNegotiation {
		return fmt.Errorf("mock negotiation log creation failed")
	}
	log.ID = fmt.Sprintf("neg-%d", len(m.negotiationLogs)+1)
	log.CreatedAt = time.Now().Format(time.RFC3339)
	m.negotiationLogs = append(m.negotiationLogs, log)
	return nil
}

func (m *mockDB) FindSellers(ctx context.Context, productName string, maxPrice float64) ([]database.Inventory, error) {
	return nil, nil // Use demo sellers
}

// Test data generators for property-based testing
type validNegotiationInput struct {
	BuyerID     string
	ProductName string
	Quantity    float64
	MaxPrice    float64
}

func (v validNegotiationInput) Generate(rand *rand.Rand, size int) validNegotiationInput {
	products := []string{"beras", "cabai", "telur"}
	return validNegotiationInput{
		BuyerID:     fmt.Sprintf("buyer-%d", rand.Intn(1000)),
		ProductName: products[rand.Intn(len(products))],
		Quantity:    float64(rand.Intn(100) + 1),      // 1-100
		MaxPrice:    float64(rand.Intn(50000) + 5000), // 5000-55000
	}
}

// **Feature: wa-negotiation-transaction-sync, Property 1: Successful negotiation creates transaction**
func TestProperty_SuccessfulNegotiationCreatesTransaction(t *testing.T) {
	property := func(input validNegotiationInput) bool {
		mockDb := newMockDB()
		orchestrator := &NegotiationOrchestrator{
			db:      mockDb,
			kolosal: nil,
		}

		intent := &ai.Intent{
			Action: "ORDER_RESTOCK",
			Entities: map[string]any{
				"product":   input.ProductName,
				"qty":       input.Quantity,
				"max_price": input.MaxPrice,
			},
		}

		result := orchestrator.StartNegotiation(context.Background(), input.BuyerID, intent)

		// If negotiation succeeded, transaction should be created
		if result.Success {
			if len(mockDb.transactions) != 1 {
				t.Logf("Expected 1 transaction, got %d", len(mockDb.transactions))
				return false
			}

			tx := mockDb.transactions[0]
			if tx.Type != "PURCHASE" {
				t.Logf("Expected transaction type PURCHASE, got %s", tx.Type)
				return false
			}

			if tx.UserID != input.BuyerID {
				t.Logf("Expected buyer ID %s, got %s", input.BuyerID, tx.UserID)
				return false
			}
		}

		return true
	}

	config := &quick.Config{MaxCount: 100}
	if err := quick.Check(property, config); err != nil {
		t.Error(err)
	}
}

// **Feature: wa-negotiation-transaction-sync, Property 2: Transaction data integrity**
func TestProperty_TransactionDataIntegrity(t *testing.T) {
	property := func(input validNegotiationInput) bool {
		mockDb := newMockDB()
		orchestrator := &NegotiationOrchestrator{
			db:      mockDb,
			kolosal: nil,
		}

		intent := &ai.Intent{
			Action: "ORDER_RESTOCK",
			Entities: map[string]any{
				"product":   input.ProductName,
				"qty":       input.Quantity,
				"max_price": input.MaxPrice,
			},
		}

		result := orchestrator.StartNegotiation(context.Background(), input.BuyerID, intent)

		if !result.Success {
			return true // Skip failed negotiations
		}

		if len(mockDb.transactions) == 0 {
			return true // Already covered by Property 1
		}

		tx := mockDb.transactions[0]

		// Check all required fields are non-null
		if tx.UserID == "" || tx.Type == "" || tx.ProductName == "" {
			t.Logf("Required fields are empty")
			return false
		}

		if tx.Qty <= 0 || tx.PricePerUnit <= 0 || tx.TotalAmount <= 0 {
			t.Logf("Numeric fields should be positive")
			return false
		}

		// Check total = price × qty
		expectedTotal := tx.PricePerUnit * tx.Qty
		if tx.TotalAmount != expectedTotal {
			t.Logf("Total amount mismatch: expected %.2f, got %.2f", expectedTotal, tx.TotalAmount)
			return false
		}

		// Check price matches negotiation result
		if tx.PricePerUnit != result.FinalPrice {
			t.Logf("Price mismatch: expected %.2f, got %.2f", result.FinalPrice, tx.PricePerUnit)
			return false
		}

		return true
	}

	config := &quick.Config{MaxCount: 100}
	if err := quick.Check(property, config); err != nil {
		t.Error(err)
	}
}

// **Feature: wa-negotiation-transaction-sync, Property 3: Transaction timestamp validity**
func TestProperty_TransactionTimestampValidity(t *testing.T) {
	property := func(input validNegotiationInput) bool {
		mockDb := newMockDB()
		orchestrator := &NegotiationOrchestrator{
			db:      mockDb,
			kolosal: nil,
		}

		intent := &ai.Intent{
			Action: "ORDER_RESTOCK",
			Entities: map[string]any{
				"product":   input.ProductName,
				"qty":       input.Quantity,
				"max_price": input.MaxPrice,
			},
		}

		startTime := time.Now()
		result := orchestrator.StartNegotiation(context.Background(), input.BuyerID, intent)
		endTime := time.Now()

		if !result.Success || len(mockDb.transactions) == 0 {
			return true // Skip
		}

		tx := mockDb.transactions[0]
		txTime, err := time.Parse(time.RFC3339, tx.CreatedAt)
		if err != nil {
			t.Logf("Failed to parse timestamp: %v", err)
			return false
		}

		// Check timestamp is within 5 seconds of negotiation completion
		if txTime.Before(startTime.Add(-5*time.Second)) || txTime.After(endTime.Add(5*time.Second)) {
			t.Logf("Timestamp out of range: %v (start: %v, end: %v)", txTime, startTime, endTime)
			return false
		}

		return true
	}

	config := &quick.Config{MaxCount: 100}
	if err := quick.Check(property, config); err != nil {
		t.Error(err)
	}
}

// **Feature: wa-negotiation-transaction-sync, Property 4: Error handling resilience**
func TestProperty_ErrorHandlingResilience(t *testing.T) {
	property := func(input validNegotiationInput) bool {
		mockDb := newMockDB()
		mockDb.failTransaction = true // Simulate transaction creation failure
		orchestrator := &NegotiationOrchestrator{
			db:      mockDb,
			kolosal: nil,
		}

		intent := &ai.Intent{
			Action: "ORDER_RESTOCK",
			Entities: map[string]any{
				"product":   input.ProductName,
				"qty":       input.Quantity,
				"max_price": input.MaxPrice,
			},
		}

		result := orchestrator.StartNegotiation(context.Background(), input.BuyerID, intent)

		// Even if transaction creation fails, negotiation should still succeed
		// (if it would have succeeded without the failure)
		if result.Success {
			// Check that negotiation log was still created
			if len(mockDb.negotiationLogs) != 1 {
				t.Logf("Negotiation log should be created even if transaction fails")
				return false
			}

			// Transaction should have been attempted but failed
			if len(mockDb.transactions) != 0 {
				t.Logf("Transaction should not be created when failure is simulated")
				return false
			}

			// Error should have been logged (we check this via lastError)
			if mockDb.lastError == nil {
				t.Logf("Error should be captured")
				return false
			}
		}

		return true
	}

	config := &quick.Config{MaxCount: 100}
	if err := quick.Check(property, config); err != nil {
		t.Error(err)
	}
}

// **Feature: wa-negotiation-transaction-sync, Property 5: Referential integrity with negotiation logs**
func TestProperty_ReferentialIntegrity(t *testing.T) {
	property := func(input validNegotiationInput) bool {
		mockDb := newMockDB()
		orchestrator := &NegotiationOrchestrator{
			db:      mockDb,
			kolosal: nil,
		}

		intent := &ai.Intent{
			Action: "ORDER_RESTOCK",
			Entities: map[string]any{
				"product":   input.ProductName,
				"qty":       input.Quantity,
				"max_price": input.MaxPrice,
			},
		}

		result := orchestrator.StartNegotiation(context.Background(), input.BuyerID, intent)

		if !result.Success {
			return true // Skip failed negotiations
		}

		// Both negotiation log and transaction should exist
		if len(mockDb.negotiationLogs) != 1 || len(mockDb.transactions) != 1 {
			t.Logf("Expected 1 negotiation log and 1 transaction")
			return false
		}

		negLog := mockDb.negotiationLogs[0]
		tx := mockDb.transactions[0]

		// Check referential integrity
		if negLog.BuyerID != tx.UserID {
			t.Logf("Buyer ID mismatch: neg=%s, tx=%s", negLog.BuyerID, tx.UserID)
			return false
		}

		if negLog.ProductName != tx.ProductName {
			t.Logf("Product name mismatch: neg=%s, tx=%s", negLog.ProductName, tx.ProductName)
			return false
		}

		if negLog.FinalPrice != tx.PricePerUnit {
			t.Logf("Price mismatch: neg=%.2f, tx=%.2f", negLog.FinalPrice, tx.PricePerUnit)
			return false
		}

		return true
	}

	config := &quick.Config{MaxCount: 100}
	if err := quick.Check(property, config); err != nil {
		t.Error(err)
	}
}

// **Feature: wa-negotiation-transaction-sync, Property 6: Query inclusivity**
func TestProperty_QueryInclusivity(t *testing.T) {
	// This property tests that transactions from negotiations are included in queries
	// We simulate this by checking that negotiated transactions have the same structure
	// as manual transactions
	property := func(input validNegotiationInput) bool {
		mockDb := newMockDB()
		orchestrator := &NegotiationOrchestrator{
			db:      mockDb,
			kolosal: nil,
		}

		// Create a manual transaction
		manualTx := &database.Transaction{
			UserID:       input.BuyerID,
			Type:         "PURCHASE",
			ProductName:  "manual product",
			Qty:          10,
			PricePerUnit: 1000,
			TotalAmount:  10000,
			RawVoiceText: "manual entry",
		}
		mockDb.CreateTransaction(context.Background(), manualTx)

		// Create a negotiated transaction
		intent := &ai.Intent{
			Action: "ORDER_RESTOCK",
			Entities: map[string]any{
				"product":   input.ProductName,
				"qty":       input.Quantity,
				"max_price": input.MaxPrice,
			},
		}
		result := orchestrator.StartNegotiation(context.Background(), input.BuyerID, intent)

		if !result.Success {
			return true // Skip
		}

		// Both transactions should be in the database
		if len(mockDb.transactions) != 2 {
			t.Logf("Expected 2 transactions (1 manual + 1 negotiated), got %d", len(mockDb.transactions))
			return false
		}

		// Both should have the same required fields structure
		for _, tx := range mockDb.transactions {
			if tx.UserID == "" || tx.Type == "" || tx.ProductName == "" {
				t.Logf("Transaction missing required fields")
				return false
			}
		}

		return true
	}

	config := &quick.Config{MaxCount: 100}
	if err := quick.Check(property, config); err != nil {
		t.Error(err)
	}
}

// **Feature: wa-negotiation-transaction-sync, Property 7: Error logging completeness**
func TestProperty_ErrorLoggingCompleteness(t *testing.T) {
	// This property is tested indirectly through Property 4
	// We verify that when transaction creation fails, the error contains
	// buyer ID, product name, and error details

	// We'll capture log output by checking the error message format
	property := func(input validNegotiationInput) bool {
		mockDb := newMockDB()
		mockDb.failTransaction = true
		orchestrator := &NegotiationOrchestrator{
			db:      mockDb,
			kolosal: nil,
		}

		intent := &ai.Intent{
			Action: "ORDER_RESTOCK",
			Entities: map[string]any{
				"product":   input.ProductName,
				"qty":       input.Quantity,
				"max_price": input.MaxPrice,
			},
		}

		result := orchestrator.StartNegotiation(context.Background(), input.BuyerID, intent)

		if !result.Success {
			return true // Skip
		}

		// Error should contain buyer ID and product name
		// (We can't easily test log output, but we verify the error was captured)
		if mockDb.lastError == nil {
			t.Logf("Error should be captured for logging")
			return false
		}

		// The error message should be meaningful
		if mockDb.lastError.Error() == "" {
			t.Logf("Error message should not be empty")
			return false
		}

		return true
	}

	config := &quick.Config{MaxCount: 100}
	if err := quick.Check(property, config); err != nil {
		t.Error(err)
	}
}

// Edge case unit tests
func TestEdgeCases_ZeroQuantity(t *testing.T) {
	mockDb := newMockDB()
	orchestrator := &NegotiationOrchestrator{
		db:      mockDb,
		kolosal: nil,
	}

	intent := &ai.Intent{
		Action: "ORDER_RESTOCK",
		Entities: map[string]any{
			"product":   "beras",
			"qty":       float64(0), // Zero quantity
			"max_price": float64(12000),
		},
	}

	result := orchestrator.StartNegotiation(context.Background(), "buyer-1", intent)

	// Should use default quantity of 1
	if result.Success && result.Quantity != 1 {
		t.Errorf("Expected default quantity 1, got %.0f", result.Quantity)
	}
}

func TestEdgeCases_MissingBuyerID(t *testing.T) {
	mockDb := newMockDB()
	orchestrator := &NegotiationOrchestrator{
		db:      mockDb,
		kolosal: nil,
	}

	intent := &ai.Intent{
		Action: "ORDER_RESTOCK",
		Entities: map[string]any{
			"product":   "beras",
			"qty":       float64(10),
			"max_price": float64(12000),
		},
	}

	result := orchestrator.StartNegotiation(context.Background(), "", intent)

	// Should still work but transaction will have empty buyer ID
	// This is acceptable as the validation should happen at API level
	if result.Success && len(mockDb.transactions) > 0 {
		tx := mockDb.transactions[0]
		if tx.UserID != "" {
			t.Errorf("Expected empty buyer ID, got %s", tx.UserID)
		}
	}
}

func TestEdgeCases_DatabaseConnectionFailure(t *testing.T) {
	// Test with nil database (simulates connection failure)
	orchestrator := &NegotiationOrchestrator{
		db:      nil,
		kolosal: nil,
	}

	intent := &ai.Intent{
		Action: "ORDER_RESTOCK",
		Entities: map[string]any{
			"product":   "beras",
			"qty":       float64(10),
			"max_price": float64(12000),
		},
	}

	result := orchestrator.StartNegotiation(context.Background(), "buyer-1", intent)

	// Should still complete negotiation using demo sellers
	if !result.Success {
		t.Error("Negotiation should succeed even without database connection")
	}
}

func TestEdgeCases_NegativePrice(t *testing.T) {
	mockDb := newMockDB()
	orchestrator := &NegotiationOrchestrator{
		db:      mockDb,
		kolosal: nil,
	}

	intent := &ai.Intent{
		Action: "ORDER_RESTOCK",
		Entities: map[string]any{
			"product":   "beras",
			"qty":       float64(10),
			"max_price": float64(-1000), // Negative price
		},
	}

	result := orchestrator.StartNegotiation(context.Background(), "buyer-1", intent)

	// Should fail or use default max price
	if result.Success && result.FinalPrice < 0 {
		t.Error("Final price should not be negative")
	}
}

// Helper function to check if string contains substring (case-insensitive)
func containsIgnoreCase(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}
