package agents

import (
	"context"
	"fmt"
	"log"

	"github.com/pasarsuara/backend/internal/ai"
	"github.com/pasarsuara/backend/internal/database"
)

// InventoryAgent manages inventory operations
type InventoryAgent struct {
	db *database.SupabaseClient
}

// StockAlert represents a low stock alert
type StockAlert struct {
	ProductName  string  `json:"product_name"`
	CurrentStock float64 `json:"current_stock"`
	ReorderPoint float64 `json:"reorder_point"`
	Unit         string  `json:"unit"`
	Severity     string  `json:"severity"` // LOW, CRITICAL, OUT_OF_STOCK
}

func NewInventoryAgent(db *database.SupabaseClient) *InventoryAgent {
	return &InventoryAgent{db: db}
}

// UpdateStockAfterSale automatically reduces stock after a sale
func (a *InventoryAgent) UpdateStockAfterSale(ctx context.Context, userID string, intent *ai.Intent) (*StockAlert, error) {
	product := getStringEntity(intent.Entities, "product")
	qtySold := getFloatEntity(intent.Entities, "qty")

	if product == "" || qtySold <= 0 {
		return nil, nil // No stock update needed
	}

	// Get current inventory
	inv, err := a.db.GetInventoryByProductSQL(ctx, userID, product)
	if err != nil {
		log.Printf("⚠️ Failed to get inventory: %v", err)
		return nil, err
	}

	if inv == nil {
		// Auto-create inventory item when product not found
		unit := getStringEntity(intent.Entities, "unit")
		if unit == "" {
			unit = "pcs"
		}
		price := getFloatEntity(intent.Entities, "price")

		newInv := &database.Inventory{
			UserID:       userID,
			ProductName:  product,
			StockQty:     -qtySold, // Negative: sold without prior stock
			Unit:         unit,
			MinSellPrice: price,
		}
		if err := a.db.CreateInventory(ctx, newInv); err != nil {
			log.Printf("❌ Failed to auto-create inventory for '%s': %v", product, err)
			return nil, nil
		}
		log.Printf("✅ Auto-created inventory: %s (stock: -%.0f %s, price: Rp %.0f)", product, qtySold, unit, price)

		// Check stock level for the new item
		alert := a.checkStockLevel(product, -qtySold, unit)
		return alert, nil
	}

	// Calculate new stock
	newStock := inv.StockQty - qtySold

	// Update stock
	err = a.db.UpdateInventoryStock(ctx, inv.ID, newStock)
	if err != nil {
		log.Printf("❌ Failed to update stock: %v", err)
		return nil, err
	}

	log.Printf("✅ Stock updated: %s %.0f → %.0f %s", product, inv.StockQty, newStock, inv.Unit)

	// Check if stock is low
	alert := a.checkStockLevel(inv.ProductName, newStock, inv.Unit)
	return alert, nil
}

// UpdateStockAfterPurchase automatically increases stock after a purchase
func (a *InventoryAgent) UpdateStockAfterPurchase(ctx context.Context, userID string, intent *ai.Intent, qtyPurchased float64) error {
	product := getStringEntity(intent.Entities, "product")

	if product == "" || qtyPurchased <= 0 {
		return nil
	}

	// Get current inventory
	inv, err := a.db.GetInventoryByProductSQL(ctx, userID, product)
	if err != nil {
		return err
	}

	if inv == nil {
		// Create new inventory entry
		unit := getStringEntity(intent.Entities, "unit")
		if unit == "" {
			unit = "unit"
		}

		price := getFloatEntity(intent.Entities, "price")
		newInv := &database.Inventory{
			UserID:      userID,
			ProductName: product,
			StockQty:    qtyPurchased,
			Unit:        unit,
			MaxBuyPrice: price,
		}
		if err := a.db.CreateInventory(ctx, newInv); err != nil {
			log.Printf("❌ Failed to create inventory for '%s': %v", product, err)
			return err
		}
		log.Printf("✅ New inventory created: %s %.0f %s", product, qtyPurchased, unit)
		return nil
	}

	// Update existing stock
	newStock := inv.StockQty + qtyPurchased
	err = a.db.UpdateInventoryStock(ctx, inv.ID, newStock)
	if err != nil {
		return err
	}

	log.Printf("✅ Stock updated: %s %.0f → %.0f %s", product, inv.StockQty, newStock, inv.Unit)
	return nil
}

// checkStockLevel checks if stock is low and returns alert
func (a *InventoryAgent) checkStockLevel(product string, currentStock float64, unit string) *StockAlert {
	// Simple reorder point logic (can be made more sophisticated)
	reorderPoint := 10.0 // Default reorder point

	// Adjust reorder point based on unit
	switch unit {
	case "kg", "liter":
		reorderPoint = 5.0
	case "butir", "pcs":
		reorderPoint = 20.0
	case "porsi":
		reorderPoint = 0 // No reorder for prepared items
	}

	if reorderPoint == 0 {
		return nil // No alert for this type
	}

	var severity string
	if currentStock <= 0 {
		severity = "OUT_OF_STOCK"
	} else if currentStock <= reorderPoint*0.3 {
		severity = "CRITICAL"
	} else if currentStock <= reorderPoint {
		severity = "LOW"
	} else {
		return nil // Stock is fine
	}

	return &StockAlert{
		ProductName:  product,
		CurrentStock: currentStock,
		ReorderPoint: reorderPoint,
		Unit:         unit,
		Severity:     severity,
	}
}

// GetLowStockAlerts returns all products with low stock
func (a *InventoryAgent) GetLowStockAlerts(ctx context.Context, userID string) ([]StockAlert, error) {
	// TODO: Implement when we have GetAllInventory method
	return []StockAlert{}, nil
}

// FormatStockAlert formats stock alert for WhatsApp message
func (a *InventoryAgent) FormatStockAlert(alert *StockAlert) string {
	if alert == nil {
		return ""
	}

	var emoji string
	var message string

	switch alert.Severity {
	case "OUT_OF_STOCK":
		emoji = "🚨"
		message = fmt.Sprintf("%s STOK HABIS!\n\n"+
			"📦 Produk: %s\n"+
			"📊 Stok: 0 %s\n"+
			"⚠️ Segera restock!\n\n"+
			"Mau saya carikan supplier?",
			emoji, alert.ProductName, alert.Unit)

	case "CRITICAL":
		emoji = "⚠️"
		message = fmt.Sprintf("%s STOK KRITIS!\n\n"+
			"📦 Produk: %s\n"+
			"📊 Stok: %.0f %s\n"+
			"🎯 Reorder point: %.0f %s\n\n"+
			"Stok hampir habis, segera restock!",
			emoji, alert.ProductName, alert.CurrentStock, alert.Unit,
			alert.ReorderPoint, alert.Unit)

	case "LOW":
		emoji = "📉"
		message = fmt.Sprintf("%s Stok Menipis\n\n"+
			"📦 Produk: %s\n"+
			"📊 Stok: %.0f %s\n"+
			"🎯 Reorder point: %.0f %s\n\n"+
			"Pertimbangkan untuk restock segera.",
			emoji, alert.ProductName, alert.CurrentStock, alert.Unit,
			alert.ReorderPoint, alert.Unit)
	}

	return message
}
