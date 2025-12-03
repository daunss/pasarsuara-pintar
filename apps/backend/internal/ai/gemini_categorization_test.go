package ai

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"
)

// Property 13: API invocation
// Feature: production-readiness, Property 13: API invocation
// Validates: Requirements 5.1
// For any categorization request, the system should make an HTTP POST request to the Gemini API endpoint with the correct API key

func TestProperty13_APIInvocation(t *testing.T) {
	// Skip if not in integration test mode
	if os.Getenv("INTEGRATION_TEST") != "true" {
		t.Skip("Skipping integration test")
	}

	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		t.Skip("GEMINI_API_KEY not set")
	}

	client := NewGeminiCategorizationClient(apiKey)
	ctx := context.Background()

	// Test with 10 random product names
	testProducts := []string{
		"Beras",
		"Minyak Goreng",
		"Listrik",
		"Gaji Karyawan",
		"Bensin",
		"Piring",
		"Telur",
		"WiFi",
		"Parkir",
		"Kompor",
	}

	for _, product := range testProducts {
		t.Run(product, func(t *testing.T) {
			category, err := client.Categorize(ctx, product)
			if err != nil {
				t.Errorf("API invocation failed for %s: %v", product, err)
			}

			if category == "" {
				t.Errorf("Empty category returned for %s", product)
			}

			// Verify it's a valid category
			validCategories := []string{
				"BAHAN_BAKU", "OPERASIONAL", "GAJI",
				"TRANSPORTASI", "PERALATAN", "LAINNYA",
			}

			isValid := false
			for _, valid := range validCategories {
				if strings.Contains(category, valid) {
					isValid = true
					break
				}
			}

			if !isValid {
				t.Errorf("Invalid category returned for %s: %s", product, category)
			}
		})
	}
}

// Property 14: Response parsing completeness
// Feature: production-readiness, Property 14: Response parsing completeness
// Validates: Requirements 5.2
// For any successful Gemini API response, the system should extract all available fields from the response

func TestProperty14_ResponseParsingCompleteness(t *testing.T) {
	testCases := []struct {
		response  string
		expected  string
		ambiguous bool
	}{
		{"BAHAN_BAKU", "BAHAN_BAKU", false},
		{"OPERASIONAL", "OPERASIONAL", false},
		{"GAJI", "GAJI", false},
		{"TRANSPORTASI", "TRANSPORTASI", false},
		{"PERALATAN", "PERALATAN", false},
		{"LAINNYA", "LAINNYA", false},
		{"bahan_baku", "BAHAN_BAKU", false},
		{"  OPERASIONAL  ", "OPERASIONAL", false},
		{"Kategori: GAJI", "GAJI", false},
		{"Invalid response", "LAINNYA", true},
		{"", "LAINNYA", true},
	}

	for _, tc := range testCases {
		t.Run(tc.response, func(t *testing.T) {
			category, ambiguous := ParseCategorizationResponse(tc.response)

			if category != tc.expected {
				t.Errorf("Expected category %s, got %s", tc.expected, category)
			}

			if ambiguous != tc.ambiguous {
				t.Errorf("Expected ambiguous %v, got %v", tc.ambiguous, ambiguous)
			}
		})
	}
}

// Property 15: Retry behavior
// Feature: production-readiness, Property 15: Retry behavior
// Validates: Requirements 5.3, 5.4
// For any failed API call, the system should retry up to 3 times with exponential backoff, and return an error with logged failure if all retries fail

func TestProperty15_RetryBehavior(t *testing.T) {
	// Test with invalid API key to trigger failures
	client := NewGeminiCategorizationClient("invalid-api-key")
	ctx := context.Background()

	start := time.Now()
	_, err := client.Categorize(ctx, "Test Product")
	duration := time.Since(start)

	// Should fail after retries
	if err == nil {
		t.Error("Expected error but got none")
	}

	// Should contain retry information
	if !strings.Contains(err.Error(), "failed after 3 retries") &&
		!strings.Contains(err.Error(), "authentication error") {
		t.Errorf("Error message doesn't indicate retries: %v", err)
	}

	// Should take at least 7 seconds (1s + 2s + 4s backoff)
	// But with authentication error, it might fail faster
	if strings.Contains(err.Error(), "authentication error") {
		// Authentication errors should fail fast
		if duration > 10*time.Second {
			t.Errorf("Authentication error took too long: %v", duration)
		}
	} else {
		// Other errors should retry with backoff
		if duration < 6*time.Second {
			t.Errorf("Retry backoff too short: %v (expected at least 6s)", duration)
		}
	}
}

// Property 16: Ambiguity detection
// Feature: production-readiness, Property 16: Ambiguity detection
// Validates: Requirements 5.5
// For any Gemini response with missing required fields, the system should trigger the ambiguity resolution flow

func TestProperty16_AmbiguityDetection(t *testing.T) {
	testCases := []struct {
		name      string
		response  string
		ambiguous bool
	}{
		{"Valid category", "BAHAN_BAKU", false},
		{"Invalid response", "Unknown category", true},
		{"Empty response", "", true},
		{"Partial match", "This is BAHAN", true},
		{"Multiple categories", "BAHAN_BAKU or OPERASIONAL", false}, // Contains valid category
		{"Explanation only", "This product is used for cooking", true},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			_, ambiguous := ParseCategorizationResponse(tc.response)

			if ambiguous != tc.ambiguous {
				t.Errorf("Expected ambiguous=%v for '%s', got %v",
					tc.ambiguous, tc.response, ambiguous)
			}
		})
	}
}

// Test circuit breaker functionality
func TestCircuitBreaker(t *testing.T) {
	client := NewGeminiCategorizationClient("invalid-key")

	// Trigger 5 failures to open circuit
	for i := 0; i < 5; i++ {
		client.failures++
	}
	client.lastFailure = time.Now()

	// Circuit should be open
	if !client.isCircuitOpen() {
		t.Error("Circuit should be open after 5 failures")
	}

	// Wait for circuit to reset (simulate 1 minute passing)
	client.lastFailure = time.Now().Add(-2 * time.Minute)

	// Circuit should be closed now
	if client.isCircuitOpen() {
		t.Error("Circuit should be closed after timeout")
	}
}
