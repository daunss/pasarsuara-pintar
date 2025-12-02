package agents

import (
	"context"
	"fmt"
	"log"

	"github.com/pasarsuara/backend/internal/ai"
	"github.com/pasarsuara/backend/internal/database"
)

// FinanceAgent handles transaction recording
type FinanceAgent struct {
	db *database.SupabaseClient
}

func NewFinanceAgent(db *database.SupabaseClient) *FinanceAgent {
	return &FinanceAgent{db: db}
}

// RecordSale records a sale transaction with payment and audit log
func (f *FinanceAgent) RecordSale(ctx context.Context, userID string, intent *ai.Intent) (*database.Transaction, error) {
	log.Printf("💰 Finance Agent: Recording sale for user %s", userID)

	product := getStringEntity(intent.Entities, "product")
	qty := getFloatEntity(intent.Entities, "qty")
	price := getFloatEntity(intent.Entities, "price")

	tx := &database.Transaction{
		UserID:       userID,
		Type:         "SALE",
		ProductName:  product,
		Qty:          qty,
		PricePerUnit: price,
		TotalAmount:  qty * price,
		RawVoiceText: intent.RawText,
	}

	if f.db != nil {
		// Create transaction
		if err := f.db.CreateTransaction(ctx, tx); err != nil {
			log.Printf("❌ Failed to record sale: %v", err)
			return nil, err
		}
		log.Printf("✅ Sale recorded: %s x%.0f = Rp %.0f", product, qty, tx.TotalAmount)

		// Create payment record (assume cash payment for now)
		payment := &database.Payment{
			TransactionID: tx.ID,
			Amount:        tx.TotalAmount,
			PaymentMethod: "CASH",
			Status:        "PAID",
			PaidAt:        tx.CreatedAt,
		}
		if err := f.db.CreatePayment(ctx, payment); err != nil {
			log.Printf("⚠️ Failed to create payment record: %v", err)
		}

		// Create audit log
		auditLog := &database.AuditLog{
			UserID:     userID,
			Action:     "CREATE_SALE",
			EntityType: "transaction",
			EntityID:   tx.ID,
			NewData:    tx,
		}
		if err := f.db.LogAudit(ctx, auditLog); err != nil {
			log.Printf("⚠️ Failed to create audit log: %v", err)
		}
	} else {
		log.Printf("⚠️ Database not configured, sale not persisted")
	}

	return tx, nil
}

// RecordPurchase records a purchase/restock transaction with payment and audit log
func (f *FinanceAgent) RecordPurchase(ctx context.Context, userID string, intent *ai.Intent, finalPrice float64) (*database.Transaction, error) {
	log.Printf("📦 Finance Agent: Recording purchase for user %s", userID)

	product := getStringEntity(intent.Entities, "product")
	qty := getFloatEntity(intent.Entities, "qty")

	tx := &database.Transaction{
		UserID:       userID,
		Type:         "PURCHASE",
		ProductName:  product,
		Qty:          qty,
		PricePerUnit: finalPrice,
		TotalAmount:  qty * finalPrice,
		RawVoiceText: intent.RawText,
	}

	if f.db != nil {
		// Create transaction
		if err := f.db.CreateTransaction(ctx, tx); err != nil {
			log.Printf("❌ Failed to record purchase: %v", err)
			return nil, err
		}
		log.Printf("✅ Purchase recorded: %s x%.0f @ Rp %.0f = Rp %.0f", product, qty, finalPrice, tx.TotalAmount)

		// Create payment record (pending by default for purchases)
		payment := &database.Payment{
			TransactionID: tx.ID,
			Amount:        tx.TotalAmount,
			PaymentMethod: "TRANSFER",
			Status:        "PENDING",
		}
		if err := f.db.CreatePayment(ctx, payment); err != nil {
			log.Printf("⚠️ Failed to create payment record: %v", err)
		}

		// Create audit log
		auditLog := &database.AuditLog{
			UserID:     userID,
			Action:     "CREATE_PURCHASE",
			EntityType: "transaction",
			EntityID:   tx.ID,
			NewData:    tx,
		}
		if err := f.db.LogAudit(ctx, auditLog); err != nil {
			log.Printf("⚠️ Failed to create audit log: %v", err)
		}
	}

	return tx, nil
}

// RecordExpense records an expense transaction with payment and audit log
func (f *FinanceAgent) RecordExpense(ctx context.Context, userID string, intent *ai.Intent) (*database.Transaction, error) {
	log.Printf("💸 Finance Agent: Recording expense for user %s", userID)

	product := getStringEntity(intent.Entities, "product")
	qty := getFloatEntity(intent.Entities, "qty")
	price := getFloatEntity(intent.Entities, "price")

	if qty == 0 {
		qty = 1
	}

	tx := &database.Transaction{
		UserID:       userID,
		Type:         "EXPENSE",
		ProductName:  product,
		Qty:          qty,
		PricePerUnit: price,
		TotalAmount:  qty * price,
		RawVoiceText: intent.RawText,
	}

	if f.db != nil {
		// Create transaction
		if err := f.db.CreateTransaction(ctx, tx); err != nil {
			log.Printf("❌ Failed to record expense: %v", err)
			return nil, err
		}
		log.Printf("✅ Expense recorded: %s = Rp %.0f", product, tx.TotalAmount)

		// Create payment record
		payment := &database.Payment{
			TransactionID: tx.ID,
			Amount:        tx.TotalAmount,
			PaymentMethod: "CASH",
			Status:        "PAID",
			PaidAt:        tx.CreatedAt,
		}
		if err := f.db.CreatePayment(ctx, payment); err != nil {
			log.Printf("⚠️ Failed to create payment record: %v", err)
		}

		// Create audit log
		auditLog := &database.AuditLog{
			UserID:     userID,
			Action:     "CREATE_EXPENSE",
			EntityType: "transaction",
			EntityID:   tx.ID,
			NewData:    tx,
		}
		if err := f.db.LogAudit(ctx, auditLog); err != nil {
			log.Printf("⚠️ Failed to create audit log: %v", err)
		}
	}

	return tx, nil
}

// GetDailySummary returns today's transaction summary
func (f *FinanceAgent) GetDailySummary(ctx context.Context, userID string) string {
	// TODO: Query actual data from database
	return fmt.Sprintf("📊 Ringkasan Hari Ini:\n• Penjualan: Rp 0\n• Pembelian: Rp 0\n• Pengeluaran: Rp 0\n• Laba Kotor: Rp 0")
}

// Helper functions
func getStringEntity(entities map[string]any, key string) string {
	if v, ok := entities[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func getFloatEntity(entities map[string]any, key string) float64 {
	if v, ok := entities[key]; ok {
		switch n := v.(type) {
		case float64:
			return n
		case int:
			return float64(n)
		case int64:
			return float64(n)
		}
	}
	return 0
}
