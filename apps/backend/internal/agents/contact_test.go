package agents

import (
	"testing"

	"github.com/pasarsuara/backend/internal/database"
)

func TestFormatContactList(t *testing.T) {
	agent := NewContactAgent(nil)

	// Test empty supplier list
	emptySuppliers := agent.FormatContactList([]database.Contact{}, "SUPPLIER")
	if emptySuppliers == "" {
		t.Error("Empty supplier list should return message")
	}
	if !contains(emptySuppliers, "supplier") {
		t.Error("Should mention supplier")
	}

	// Test empty customer list
	emptyCustomers := agent.FormatContactList([]database.Contact{}, "CUSTOMER")
	if !contains(emptyCustomers, "pelanggan") {
		t.Error("Should mention pelanggan")
	}

	// Test with suppliers
	suppliers := []database.Contact{
		{
			Type:              "SUPPLIER",
			Name:              "Toko Beras Jaya",
			Phone:             "081234567890",
			City:              "Jakarta",
			Rating:            4.5,
			TotalTransactions: 10,
		},
		{
			Type:  "SUPPLIER",
			Name:  "CV Sayur Segar",
			Phone: "081234567891",
			City:  "Bandung",
		},
	}

	result := agent.FormatContactList(suppliers, "SUPPLIER")
	if result == "" {
		t.Error("Supplier list should not be empty")
	}

	// Check if suppliers are present
	if !contains(result, "Toko Beras Jaya") {
		t.Error("Should contain Toko Beras Jaya")
	}
	if !contains(result, "CV Sayur Segar") {
		t.Error("Should contain CV Sayur Segar")
	}
	if !contains(result, "Jakarta") {
		t.Error("Should contain Jakarta")
	}
	if !contains(result, "4.5") {
		t.Error("Should contain rating")
	}

	t.Logf("Supplier list:\n%s", result)

	// Test with customers
	customers := []database.Contact{
		{
			Type:              "CUSTOMER",
			Name:              "Warung Bu Siti",
			Phone:             "081234567892",
			City:              "Surabaya",
			Rating:            5.0,
			TotalTransactions: 25,
		},
	}

	customerResult := agent.FormatContactList(customers, "CUSTOMER")
	if !contains(customerResult, "Pelanggan") {
		t.Error("Should contain Pelanggan header")
	}
	if !contains(customerResult, "Warung Bu Siti") {
		t.Error("Should contain customer name")
	}

	t.Logf("Customer list:\n%s", customerResult)
}
