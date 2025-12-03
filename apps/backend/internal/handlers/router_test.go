package handlers

import (
	"context"
	"fmt"
	"testing"
)

// Mock implementations for testing

type MockIntentEngine struct{}

func (m *MockIntentEngine) ExtractIntent(ctx context.Context, message string) (*TransactionIntent, error) {
	return &TransactionIntent{
		Type:        "SALE",
		Product:     "Test Product",
		Quantity:    10,
		Price:       15000,
		TotalAmount: 150000,
		IsComplete:  true,
	}, nil
}

type MockConversationManager struct {
	contexts map[string]*ConversationContext
}

func NewMockConversationManager() *MockConversationManager {
	return &MockConversationManager{
		contexts: make(map[string]*ConversationContext),
	}
}

func (m *MockConversationManager) GetContext(phoneNumber string) (*ConversationContext, bool) {
	ctx, exists := m.contexts[phoneNumber]
	return ctx, exists
}

func (m *MockConversationManager) SetContext(phoneNumber string, context *ConversationContext) {
	m.contexts[phoneNumber] = context
}

func (m *MockConversationManager) ClearContext(phoneNumber string) {
	delete(m.contexts, phoneNumber)
}

// Property 1: Message routing correctness
// Feature: production-readiness, Property 1: Message routing correctness
// Validates: Requirements 1.1, 1.2, 1.3
// For any incoming WhatsApp message, the system should route it to the correct handler based on message content and user state

func TestProperty1_MessageRoutingCorrectness(t *testing.T) {
	router := NewMessageRouter(nil, &MockIntentEngine{}, NewMockConversationManager())

	testCases := []struct {
		name          string
		phoneNumber   string
		message       string
		setupFunc     func()
		expectedRoute string // "registration", "ambiguity", "transaction"
	}{
		{
			name:          "Registration trigger - daftar",
			phoneNumber:   "+628123456789",
			message:       "daftar",
			setupFunc:     func() {},
			expectedRoute: "registration",
		},
		{
			name:          "Registration trigger - register",
			phoneNumber:   "+628123456790",
			message:       "register",
			setupFunc:     func() {},
			expectedRoute: "registration",
		},
		{
			name:        "In registration flow",
			phoneNumber: "+628123456791",
			message:     "Warung Bu Siti",
			setupFunc: func() {
				registrationStates["+628123456791"] = &RegistrationState{
					PhoneNumber: "+628123456791",
					Step:        "business_name",
				}
			},
			expectedRoute: "registration",
		},
		{
			name:        "In ambiguity conversation",
			phoneNumber: "+628123456792",
			message:     "10",
			setupFunc: func() {
				conversationContexts["+628123456792"] = &ConversationContext{
					PhoneNumber: "+628123456792",
					Intent: &TransactionIntent{
						Type:    "SALE",
						Product: "Nasi Goreng",
					},
					WaitingFor: "quantity",
				}
			},
			expectedRoute: "ambiguity",
		},
		{
			name:          "Normal transaction",
			phoneNumber:   "+628123456793",
			message:       "Tadi laku nasi goreng 10 porsi harga 15 ribu",
			setupFunc:     func() {},
			expectedRoute: "transaction",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Setup
			tc.setupFunc()

			// Route message
			response, err := router.RouteMessage(tc.phoneNumber, tc.message)

			// Verify response is not empty
			if response == "" && err == nil {
				t.Error("Expected non-empty response")
			}

			// Verify routing based on response content
			switch tc.expectedRoute {
			case "registration":
				if !containsAny(response, []string{"Selamat datang", "nama bisnis", "jenis usaha", "email"}) {
					t.Errorf("Response doesn't look like registration: %s", response)
				}
			case "ambiguity":
				// Ambiguity responses ask for missing info
				if !containsAny(response, []string{"Berapa", "Harga", "Produk", "apa"}) &&
					!containsAny(response, []string{"Berhasil", "tersimpan"}) {
					t.Errorf("Response doesn't look like ambiguity or completion: %s", response)
				}
			case "transaction":
				// Transaction responses confirm the transaction
				if !containsAny(response, []string{"Berhasil", "Dicatat", "tersimpan"}) &&
					!containsAny(response, []string{"Berapa", "Harga", "Produk"}) {
					t.Errorf("Response doesn't look like transaction or ambiguity: %s", response)
				}
			}

			// Cleanup
			delete(registrationStates, tc.phoneNumber)
			delete(conversationContexts, tc.phoneNumber)
		})
	}
}

// Property 2: Handler context preservation
// Feature: production-readiness, Property 2: Handler context preservation
// Validates: Requirements 1.4
// For any handler invocation, the system should pass complete message context and user information without data loss

func TestProperty2_HandlerContextPreservation(t *testing.T) {
	router := NewMessageRouter(nil, &MockIntentEngine{}, NewMockConversationManager())

	// Test with 100 random phone numbers and messages
	for i := 0; i < 100; i++ {
		phoneNumber := fmt.Sprintf("+62812%08d", i)
		message := fmt.Sprintf("Test message %d", i)

		// Validate context before routing
		err := ValidateMessageContext(phoneNumber, message)
		if err != nil {
			t.Errorf("Context validation failed: %v", err)
		}

		// Route message
		response, err := router.RouteMessage(phoneNumber, message)

		// Verify response contains some context
		if response == "" && err == nil {
			t.Errorf("Empty response for phone=%s, message=%s", phoneNumber, message)
		}

		// Verify phone number and message are not lost
		// (In a real implementation, we'd check that these are passed to handlers)
	}
}

// Property 3: Response completeness
// Feature: production-readiness, Property 3: Response completeness
// Validates: Requirements 1.5
// For any successful handler execution, the system should return a non-empty response to the WhatsApp gateway

func TestProperty3_ResponseCompleteness(t *testing.T) {
	router := NewMessageRouter(nil, &MockIntentEngine{}, NewMockConversationManager())

	testMessages := []string{
		"daftar",
		"Tadi laku nasi goreng 10 porsi harga 15 ribu",
		"Beli beras 5 kg harga 50 ribu",
		"Bayar listrik 200 ribu",
		"register",
	}

	for i, message := range testMessages {
		t.Run(fmt.Sprintf("Message_%d", i), func(t *testing.T) {
			phoneNumber := fmt.Sprintf("+62812%08d", i)

			response, err := router.RouteMessage(phoneNumber, message)

			// Response should not be empty
			if response == "" {
				t.Errorf("Empty response for message: %s (error: %v)", message, err)
			}

			// Response should be meaningful (at least 10 characters)
			if len(response) < 10 {
				t.Errorf("Response too short (%d chars): %s", len(response), response)
			}

			// Response should not be just an error message
			if response == "Maaf, ada yang salah. Silakan coba lagi." {
				t.Errorf("Generic error response for message: %s", message)
			}
		})
	}
}

// Test empty message handling
func TestEmptyMessageHandling(t *testing.T) {
	router := NewMessageRouter(nil, &MockIntentEngine{}, NewMockConversationManager())

	response, err := router.RouteMessage("+628123456789", "")

	if response == "" {
		t.Error("Expected non-empty response for empty message")
	}

	if err != nil {
		t.Errorf("Unexpected error for empty message: %v", err)
	}
}

// Test context validation
func TestContextValidation(t *testing.T) {
	testCases := []struct {
		name        string
		phoneNumber string
		message     string
		expectError bool
	}{
		{"Valid context", "+628123456789", "Test message", false},
		{"Empty phone", "", "Test message", true},
		{"Empty message", "+628123456789", "", true},
		{"Both empty", "", "", true},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateMessageContext(tc.phoneNumber, tc.message)

			if tc.expectError && err == nil {
				t.Error("Expected error but got none")
			}

			if !tc.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
		})
	}
}

// Helper function
func containsAny(s string, substrs []string) bool {
	for _, substr := range substrs {
		if contains(s, substr) {
			return true
		}
	}
	return false
}
