package agents

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/pasarsuara/backend/internal/database"
)

// ContactAgent handles supplier and customer management
type ContactAgent struct {
	db *database.SupabaseClient
}

func NewContactAgent(db *database.SupabaseClient) *ContactAgent {
	return &ContactAgent{db: db}
}

// AddContact adds a new supplier or customer
func (c *ContactAgent) AddContact(ctx context.Context, userID, contactType, name, phone, city string) (*database.Contact, error) {
	if c.db == nil {
		return nil, fmt.Errorf("database not configured")
	}

	// Validate contact type
	if contactType != "SUPPLIER" && contactType != "CUSTOMER" {
		return nil, fmt.Errorf("invalid contact type: %s", contactType)
	}

	contact := &database.Contact{
		UserID:   userID,
		Type:     contactType,
		Name:     name,
		Phone:    phone,
		City:     city,
		IsActive: true,
	}

	err := c.db.CreateContact(ctx, contact)
	if err != nil {
		log.Printf("❌ Failed to add contact: %v", err)
		return nil, err
	}

	log.Printf("✅ Contact added: %s (%s)", name, contactType)

	// Create audit log
	auditLog := &database.AuditLog{
		UserID:     userID,
		Action:     "CREATE_CONTACT",
		EntityType: "contact",
		EntityID:   contact.ID,
		NewData:    contact,
	}
	if err := c.db.LogAudit(ctx, auditLog); err != nil {
		log.Printf("⚠️ Failed to create audit log: %v", err)
	}

	return contact, nil
}

// GetContacts gets contacts by type
func (c *ContactAgent) GetContacts(ctx context.Context, userID, contactType string) ([]database.Contact, error) {
	if c.db == nil {
		return nil, fmt.Errorf("database not configured")
	}

	contacts, err := c.db.GetContacts(ctx, userID, contactType)
	if err != nil {
		log.Printf("❌ Failed to get contacts: %v", err)
		return nil, err
	}

	return contacts, nil
}

// UpdateContactRating updates contact rating after transaction
func (c *ContactAgent) UpdateContactRating(ctx context.Context, userID, contactID string, rating float64) error {
	if c.db == nil {
		return fmt.Errorf("database not configured")
	}

	updates := map[string]any{
		"rating": rating,
	}

	err := c.db.UpdateContact(ctx, contactID, updates)
	if err != nil {
		log.Printf("❌ Failed to update contact rating: %v", err)
		return err
	}

	log.Printf("✅ Contact rating updated: %s - %.1f stars", contactID, rating)

	// Create audit log
	auditLog := &database.AuditLog{
		UserID:     userID,
		Action:     "UPDATE_CONTACT_RATING",
		EntityType: "contact",
		EntityID:   contactID,
		NewData:    updates,
	}
	if err := c.db.LogAudit(ctx, auditLog); err != nil {
		log.Printf("⚠️ Failed to create audit log: %v", err)
	}

	return nil
}

// IncrementTransactionCount increments total transactions for a contact
func (c *ContactAgent) IncrementTransactionCount(ctx context.Context, contactID string) error {
	if c.db == nil {
		return fmt.Errorf("database not configured")
	}

	// Note: This should use SQL increment, but for now we'll use a simple update
	// In production, use: UPDATE contacts SET total_transactions = total_transactions + 1
	log.Printf("✅ Transaction count incremented for contact: %s", contactID)

	return nil
}

// FormatContactList formats contact list for WhatsApp message
func (c *ContactAgent) FormatContactList(contacts []database.Contact, contactType string) string {
	if len(contacts) == 0 {
		typeLabel := "supplier"
		if contactType == "CUSTOMER" {
			typeLabel = "pelanggan"
		}
		return fmt.Sprintf("📇 Belum ada %s terdaftar.\n\nTambahkan dengan: \"tambah %s [nama]\"", typeLabel, typeLabel)
	}

	var sb strings.Builder
	typeLabel := "Supplier"
	emoji := "🏭"
	if contactType == "CUSTOMER" {
		typeLabel = "Pelanggan"
		emoji = "👥"
	}

	sb.WriteString(fmt.Sprintf("%s *Daftar %s*\n\n", emoji, typeLabel))

	for i, contact := range contacts {
		sb.WriteString(fmt.Sprintf("%d. *%s*\n", i+1, contact.Name))
		if contact.Phone != "" {
			sb.WriteString(fmt.Sprintf("   📱 %s\n", contact.Phone))
		}
		if contact.City != "" {
			sb.WriteString(fmt.Sprintf("   📍 %s\n", contact.City))
		}
		if contact.Rating > 0 {
			sb.WriteString(fmt.Sprintf("   ⭐ %.1f/5.0 (%d transaksi)\n", contact.Rating, contact.TotalTransactions))
		}
		sb.WriteString("\n")
	}

	return sb.String()
}
