package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// GeminiCategorizationClient handles Gemini API calls for categorization
type GeminiCategorizationClient struct {
	apiKey      string
	httpClient  *http.Client
	failures    int
	lastFailure time.Time
}

// NewGeminiCategorizationClient creates a new Gemini categorization client
func NewGeminiCategorizationClient(apiKey string) *GeminiCategorizationClient {
	return &GeminiCategorizationClient{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		failures: 0,
	}
}

// GeminiRequest represents the request structure for Gemini API
type GeminiRequest struct {
	Contents []GeminiContent `json:"contents"`
}

// GeminiContent represents content in the request
type GeminiContent struct {
	Parts []GeminiPart `json:"parts"`
}

// GeminiPart represents a part of the content
type GeminiPart struct {
	Text string `json:"text"`
}

// GeminiResponse represents the response from Gemini API
type GeminiResponse struct {
	Candidates []GeminiCandidate `json:"candidates"`
}

// GeminiCandidate represents a candidate response
type GeminiCandidate struct {
	Content GeminiContent `json:"content"`
}

// Categorize categorizes a product using Gemini API
func (c *GeminiCategorizationClient) Categorize(ctx context.Context, productName string) (string, error) {
	// Check circuit breaker
	if c.isCircuitOpen() {
		return "", fmt.Errorf("circuit breaker open: too many failures")
	}

	prompt := fmt.Sprintf(`Kategorikan produk "%s" ke salah satu kategori berikut:

BAHAN_BAKU - Bahan mentah untuk produksi (beras, minyak, telur, sayur, dll)
OPERASIONAL - Biaya operasional (listrik, air, gas, wifi, sewa, dll)
GAJI - Gaji dan upah karyawan
TRANSPORTASI - Biaya transportasi (bensin, ojek, parkir, dll)
PERALATAN - Peralatan dan perlengkapan usaha
LAINNYA - Kategori lain yang tidak masuk di atas

Jawab HANYA dengan nama kategori (contoh: BAHAN_BAKU).
Jangan tambahkan penjelasan lain.`, productName)

	// Retry with exponential backoff
	var lastErr error
	backoffs := []time.Duration{1 * time.Second, 2 * time.Second, 4 * time.Second}

	for attempt := 0; attempt < 3; attempt++ {
		response, err := c.callAPI(ctx, prompt)
		if err == nil {
			// Success - reset failure counter
			c.failures = 0
			return response, nil
		}

		lastErr = err

		// Increment failure counter
		c.failures++
		c.lastFailure = time.Now()

		// Wait before retry (except on last attempt)
		if attempt < 2 {
			select {
			case <-time.After(backoffs[attempt]):
			case <-ctx.Done():
				return "", ctx.Err()
			}
		}
	}

	return "", fmt.Errorf("failed after 3 retries: %w", lastErr)
}

// callAPI makes the actual API call to Gemini
func (c *GeminiCategorizationClient) callAPI(ctx context.Context, prompt string) (string, error) {
	url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"

	// Prepare request body
	reqBody := GeminiRequest{
		Contents: []GeminiContent{
			{
				Parts: []GeminiPart{
					{Text: prompt},
				},
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create request
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", c.apiKey)

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	// Check status code
	if resp.StatusCode == http.StatusUnauthorized {
		return "", fmt.Errorf("authentication error: invalid API key")
	}

	if resp.StatusCode == http.StatusTooManyRequests {
		return "", fmt.Errorf("rate limit exceeded")
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API error (%d): %s", resp.StatusCode, string(body))
	}

	// Parse response
	var geminiResp GeminiResponse
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	// Extract text from response
	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("empty response from API")
	}

	text := geminiResp.Candidates[0].Content.Parts[0].Text
	return strings.TrimSpace(text), nil
}

// isCircuitOpen checks if the circuit breaker is open
func (c *GeminiCategorizationClient) isCircuitOpen() bool {
	// Circuit opens after 5 consecutive failures
	if c.failures >= 5 {
		// Reset after 1 minute
		if time.Since(c.lastFailure) > 1*time.Minute {
			c.failures = 0
			return false
		}
		return true
	}
	return false
}

// ParseCategorizationResponse parses the categorization response
func ParseCategorizationResponse(response string) (string, bool) {
	response = strings.ToUpper(strings.TrimSpace(response))

	validCategories := []string{
		"BAHAN_BAKU",
		"OPERASIONAL",
		"GAJI",
		"TRANSPORTASI",
		"PERALATAN",
		"LAINNYA",
	}

	for _, category := range validCategories {
		if strings.Contains(response, category) {
			return category, false // Not ambiguous
		}
	}

	// If no valid category found, it's ambiguous
	return "LAINNYA", true
}
