package agents

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/pasarsuara/backend/internal/database"
)

// CatalogAgent handles product catalog management
type CatalogAgent struct {
	db *database.SupabaseClient
}

func NewCatalogAgent(db *database.SupabaseClient) *CatalogAgent {
	return &CatalogAgent{db: db}
}

// AddProduct adds a new product to catalog
func (c *CatalogAgent) AddProduct(ctx context.Context, userID, productName, category string, price float64, unit string) (*database.ProductCatalog, error) {
	if c.db == nil {
		return nil, fmt.Errorf("database not configured")
	}

	product := &database.ProductCatalog{
		UserID:       userID,
		ProductName:  productName,
		Category:     category,
		DefaultPrice: price,
		DefaultUnit:  unit,
		IsActive:     true,
	}

	err := c.db.CreateProductCatalog(ctx, product)
	if err != nil {
		log.Printf("❌ Failed to add product to catalog: %v", err)
		return nil, err
	}

	log.Printf("✅ Product added to catalog: %s (Rp %.0f/%s)", productName, price, unit)

	// Create audit log
	auditLog := &database.AuditLog{
		UserID:     userID,
		Action:     "CREATE_PRODUCT",
		EntityType: "product_catalog",
		EntityID:   product.ID,
		NewData:    product,
	}
	if err := c.db.LogAudit(ctx, auditLog); err != nil {
		log.Printf("⚠️ Failed to create audit log: %v", err)
	}

	return product, nil
}

// GetProducts gets all products from catalog
func (c *CatalogAgent) GetProducts(ctx context.Context, userID string, activeOnly bool) ([]database.ProductCatalog, error) {
	if c.db == nil {
		return nil, fmt.Errorf("database not configured")
	}

	products, err := c.db.GetProductCatalog(ctx, userID, activeOnly)
	if err != nil {
		log.Printf("❌ Failed to get products: %v", err)
		return nil, err
	}

	return products, nil
}

// UpdateProduct updates a product in catalog
func (c *CatalogAgent) UpdateProduct(ctx context.Context, userID, productID string, updates map[string]any) error {
	if c.db == nil {
		return fmt.Errorf("database not configured")
	}

	err := c.db.UpdateProductCatalog(ctx, productID, updates)
	if err != nil {
		log.Printf("❌ Failed to update product: %v", err)
		return err
	}

	log.Printf("✅ Product updated: %s", productID)

	// Create audit log
	auditLog := &database.AuditLog{
		UserID:     userID,
		Action:     "UPDATE_PRODUCT",
		EntityType: "product_catalog",
		EntityID:   productID,
		NewData:    updates,
	}
	if err := c.db.LogAudit(ctx, auditLog); err != nil {
		log.Printf("⚠️ Failed to create audit log: %v", err)
	}

	return nil
}

// FormatProductList formats product list for WhatsApp message
func (c *CatalogAgent) FormatProductList(products []database.ProductCatalog) string {
	if len(products) == 0 {
		return "📦 Katalog produk masih kosong.\n\nTambahkan produk dengan: \"tambah produk [nama] harga [harga]\""
	}

	var sb strings.Builder
	sb.WriteString("📦 *Katalog Produk*\n\n")

	// Group by category
	categoryMap := make(map[string][]database.ProductCatalog)
	for _, p := range products {
		cat := p.Category
		if cat == "" {
			cat = "Lainnya"
		}
		categoryMap[cat] = append(categoryMap[cat], p)
	}

	// Format by category
	for category, items := range categoryMap {
		sb.WriteString(fmt.Sprintf("*%s*\n", category))
		for _, p := range items {
			priceStr := ""
			if p.DefaultPrice > 0 {
				priceStr = fmt.Sprintf(" - Rp %.0f", p.DefaultPrice)
				if p.DefaultUnit != "" {
					priceStr += fmt.Sprintf("/%s", p.DefaultUnit)
				}
			}
			sb.WriteString(fmt.Sprintf("• %s%s\n", p.ProductName, priceStr))
		}
		sb.WriteString("\n")
	}

	return sb.String()
}
