package ai

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

// GeminiClient handles Speech-to-Text using Gemini API with automatic key rotation
type GeminiClient struct {
	apiKeys       []string
	currentKeyIdx int
	keyMutex      sync.Mutex
	httpClient    *http.Client
}

type GeminiRequest struct {
	Contents []GeminiContent `json:"contents"`
}

type GeminiContent struct {
	Parts []GeminiPart `json:"parts"`
}

type GeminiPart struct {
	Text       string        `json:"text,omitempty"`
	InlineData *GeminiInline `json:"inline_data,omitempty"`
}

type GeminiInline struct {
	MimeType string `json:"mime_type"`
	Data     string `json:"data"` // base64 encoded
}

type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	Error *GeminiError `json:"error,omitempty"`
}

type GeminiError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

func NewGeminiClient(apiKey string) *GeminiClient {
	// Parse comma-separated API keys
	keys := parseAPIKeys(apiKey)

	if len(keys) > 1 {
		log.Printf("✅ Gemini: Loaded %d API keys for rotation", len(keys))
	}

	return &GeminiClient{
		apiKeys:       keys,
		currentKeyIdx: 0,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// parseAPIKeys splits comma-separated API keys and trims whitespace
func parseAPIKeys(apiKey string) []string {
	if apiKey == "" {
		return []string{}
	}

	parts := strings.Split(apiKey, ",")
	keys := make([]string, 0, len(parts))

	for _, key := range parts {
		trimmed := strings.TrimSpace(key)
		if trimmed != "" {
			keys = append(keys, trimmed)
		}
	}

	return keys
}

// getCurrentKey returns the current API key (thread-safe)
func (g *GeminiClient) getCurrentKey() string {
	g.keyMutex.Lock()
	defer g.keyMutex.Unlock()

	if len(g.apiKeys) == 0 {
		return ""
	}

	return g.apiKeys[g.currentKeyIdx]
}

// rotateKey switches to the next API key (thread-safe)
func (g *GeminiClient) rotateKey() {
	g.keyMutex.Lock()
	defer g.keyMutex.Unlock()

	if len(g.apiKeys) <= 1 {
		return
	}

	oldIdx := g.currentKeyIdx
	g.currentKeyIdx = (g.currentKeyIdx + 1) % len(g.apiKeys)

	log.Printf("🔄 Rotating Gemini API key: %d → %d (total: %d keys)",
		oldIdx, g.currentKeyIdx, len(g.apiKeys))
}

// TranscribeAudio converts audio to text using Gemini with automatic key rotation
func (g *GeminiClient) TranscribeAudio(ctx context.Context, audioData []byte, mimeType string) (string, error) {
	if len(g.apiKeys) == 0 {
		return "", fmt.Errorf("Gemini API key not configured")
	}

	// Encode audio to base64
	audioBase64 := base64.StdEncoding.EncodeToString(audioData)

	// Build request
	req := GeminiRequest{
		Contents: []GeminiContent{
			{
				Parts: []GeminiPart{
					{
						Text: "Transcribe this audio to text. The audio may contain Indonesian, Javanese, or Sundanese language. Return only the transcription, nothing else.",
					},
					{
						InlineData: &GeminiInline{
							MimeType: mimeType,
							Data:     audioBase64,
						},
					},
				},
			},
		},
	}

	jsonData, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	// Try all API keys with rotation
	maxRetries := len(g.apiKeys)
	var lastErr error

	for attempt := 0; attempt < maxRetries; attempt++ {
		apiKey := g.getCurrentKey()

		// Call Gemini API
		url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=%s", apiKey)

		httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
		if err != nil {
			return "", fmt.Errorf("failed to create request: %w", err)
		}
		httpReq.Header.Set("Content-Type", "application/json")

		resp, err := g.httpClient.Do(httpReq)
		if err != nil {
			lastErr = fmt.Errorf("failed to call Gemini API: %w", err)
			log.Printf("⚠️ Gemini API call failed (attempt %d/%d): %v", attempt+1, maxRetries, err)
			g.rotateKey()
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()

		if err != nil {
			lastErr = fmt.Errorf("failed to read response: %w", err)
			log.Printf("⚠️ Failed to read response (attempt %d/%d): %v", attempt+1, maxRetries, err)
			g.rotateKey()
			continue
		}

		var geminiResp GeminiResponse
		if err := json.Unmarshal(body, &geminiResp); err != nil {
			lastErr = fmt.Errorf("failed to parse response: %w", err)
			log.Printf("⚠️ Failed to parse response (attempt %d/%d): %v", attempt+1, maxRetries, err)
			g.rotateKey()
			continue
		}

		// Check for rate limit or quota errors
		if geminiResp.Error != nil {
			lastErr = fmt.Errorf("Gemini API error: %s", geminiResp.Error.Message)

			// Rotate key on rate limit (429) or quota exceeded (403)
			if geminiResp.Error.Code == 429 || geminiResp.Error.Code == 403 {
				log.Printf("⚠️ API key quota/rate limit (code %d, attempt %d/%d): %s",
					geminiResp.Error.Code, attempt+1, maxRetries, geminiResp.Error.Message)
				g.rotateKey()

				// Small delay before retry
				time.Sleep(time.Duration(attempt+1) * 100 * time.Millisecond)
				continue
			}

			// For other errors, don't retry
			return "", lastErr
		}

		if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
			lastErr = fmt.Errorf("no transcription returned")
			log.Printf("⚠️ No transcription returned (attempt %d/%d)", attempt+1, maxRetries)
			g.rotateKey()
			continue
		}

		// Success!
		transcript := geminiResp.Candidates[0].Content.Parts[0].Text
		if attempt > 0 {
			log.Printf("✅ Transcription succeeded after %d retries", attempt)
		}
		return transcript, nil
	}

	// All keys exhausted
	log.Printf("❌ All %d API keys exhausted", len(g.apiKeys))
	return "", fmt.Errorf("all API keys exhausted: %w", lastErr)
}

// GenerateText sends a text-only prompt and returns the model response.
func (g *GeminiClient) GenerateText(ctx context.Context, prompt string) (string, error) {
	if len(g.apiKeys) == 0 {
		return "", fmt.Errorf("Gemini API key not configured")
	}

	req := GeminiRequest{
		Contents: []GeminiContent{
			{
				Parts: []GeminiPart{
					{
						Text: prompt,
					},
				},
			},
		},
	}

	jsonData, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	maxRetries := len(g.apiKeys)
	var lastErr error

	for attempt := 0; attempt < maxRetries; attempt++ {
		apiKey := g.getCurrentKey()
		url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=%s", apiKey)

		httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
		if err != nil {
			return "", fmt.Errorf("failed to create request: %w", err)
		}
		httpReq.Header.Set("Content-Type", "application/json")

		resp, err := g.httpClient.Do(httpReq)
		if err != nil {
			lastErr = fmt.Errorf("failed to call Gemini API: %w", err)
			log.Printf("⚠️ Gemini API call failed (attempt %d/%d): %v", attempt+1, maxRetries, err)
			g.rotateKey()
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = fmt.Errorf("failed to read response: %w", err)
			log.Printf("⚠️ Failed to read response (attempt %d/%d): %v", attempt+1, maxRetries, err)
			g.rotateKey()
			continue
		}

		var geminiResp GeminiResponse
		if err := json.Unmarshal(body, &geminiResp); err != nil {
			lastErr = fmt.Errorf("failed to parse response: %w", err)
			log.Printf("⚠️ Failed to parse response (attempt %d/%d): %v", attempt+1, maxRetries, err)
			g.rotateKey()
			continue
		}

		if geminiResp.Error != nil {
			lastErr = fmt.Errorf("Gemini API error: %s", geminiResp.Error.Message)
			if geminiResp.Error.Code == 429 || geminiResp.Error.Code == 403 {
				log.Printf("⚠️ API key quota/rate limit (code %d, attempt %d/%d): %s",
					geminiResp.Error.Code, attempt+1, maxRetries, geminiResp.Error.Message)
				g.rotateKey()
				time.Sleep(time.Duration(attempt+1) * 100 * time.Millisecond)
				continue
			}
			return "", lastErr
		}

		if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
			lastErr = fmt.Errorf("no response from Gemini")
			log.Printf("⚠️ No response from Gemini (attempt %d/%d)", attempt+1, maxRetries)
			g.rotateKey()
			continue
		}

		return geminiResp.Candidates[0].Content.Parts[0].Text, nil
	}

	return "", lastErr
}

// ReceiptItem represents a single item extracted from a receipt/financial photo
type ReceiptItem struct {
	Product string  `json:"product"`
	Qty     float64 `json:"qty"`
	Unit    string  `json:"unit"`
	Price   float64 `json:"price"`
	Total   float64 `json:"total"`
	Type    string  `json:"type"` // SALE, PURCHASE, EXPENSE
}

// ReceiptResult contains all items extracted from a receipt image
type ReceiptResult struct {
	Items   []ReceiptItem `json:"items"`
	Summary string        `json:"summary"`
}

// AnalyzeReceiptImage uses Gemini Vision to extract financial data from a photo
func (g *GeminiClient) AnalyzeReceiptImage(ctx context.Context, imageData []byte, mimeType string, caption string) (*ReceiptResult, error) {
	if len(g.apiKeys) == 0 {
		return nil, fmt.Errorf("Gemini API key not configured")
	}

	imageBase64 := base64.StdEncoding.EncodeToString(imageData)

	promptText := `Kamu adalah asisten pencatatan keuangan UMKM Indonesia.
Analisis foto ini yang berisi catatan keuangan, nota, struk belanja, atau daftar produk.

Ekstrak SEMUA item yang terlihat di foto. Untuk setiap item, tentukan:
- product: nama produk/barang
- qty: jumlah (default 1 jika tidak jelas)
- unit: satuan (pcs, kg, liter, porsi, dll. Default "pcs")
- price: harga per unit dalam Rupiah (angka saja, tanpa "Rp" atau titik)
- total: total harga (qty x price)
- type: "SALE" jika ini catatan penjualan, "PURCHASE" jika pembelian/belanja, "EXPENSE" jika pengeluaran

Petunjuk:
- Jika foto menunjukkan nota/struk pembelian dari toko/supplier → type = "PURCHASE"
- Jika foto menunjukkan catatan penjualan harian → type = "SALE"
- Jika foto menunjukkan daftar harga produk untuk dijual → type = "SALE" (gunakan qty=0 untuk menandai ini hanya harga catalog)
- Jika tidak jelas, gunakan type = "EXPENSE"
- Bersihkan nama produk dari singkatan yang tidak perlu
- Konversi harga dari format "15rb" atau "15.000" menjadi angka 15000`

	if caption != "" {
		promptText += "\n\nCaption dari user: " + caption
	}

	promptText += `

Jawab HANYA dalam format JSON valid (tanpa markdown code block):
{
  "items": [
    {"product": "nama produk", "qty": 1, "unit": "pcs", "price": 10000, "total": 10000, "type": "SALE"}
  ],
  "summary": "Ringkasan singkat isi foto dalam 1 kalimat bahasa Indonesia"
}`

	req := GeminiRequest{
		Contents: []GeminiContent{
			{
				Parts: []GeminiPart{
					{Text: promptText},
					{
						InlineData: &GeminiInline{
							MimeType: mimeType,
							Data:     imageBase64,
						},
					},
				},
			},
		},
	}

	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	maxRetries := len(g.apiKeys)
	var lastErr error

	for attempt := 0; attempt < maxRetries; attempt++ {
		apiKey := g.getCurrentKey()
		url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=%s", apiKey)

		httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
		if err != nil {
			return nil, fmt.Errorf("failed to create request: %w", err)
		}
		httpReq.Header.Set("Content-Type", "application/json")

		resp, err := g.httpClient.Do(httpReq)
		if err != nil {
			lastErr = err
			g.rotateKey()
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = err
			g.rotateKey()
			continue
		}

		var geminiResp GeminiResponse
		if err := json.Unmarshal(body, &geminiResp); err != nil {
			lastErr = err
			g.rotateKey()
			continue
		}

		if geminiResp.Error != nil {
			lastErr = fmt.Errorf("Gemini API error: %s", geminiResp.Error.Message)
			if geminiResp.Error.Code == 429 || geminiResp.Error.Code == 403 {
				g.rotateKey()
				time.Sleep(time.Duration(attempt+1) * 100 * time.Millisecond)
				continue
			}
			return nil, lastErr
		}

		if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
			lastErr = fmt.Errorf("no response from Gemini Vision")
			g.rotateKey()
			continue
		}

		content := geminiResp.Candidates[0].Content.Parts[0].Text
		content = strings.TrimPrefix(content, "```json\n")
		content = strings.TrimPrefix(content, "```json")
		content = strings.TrimPrefix(content, "```\n")
		content = strings.TrimSuffix(content, "\n```")
		content = strings.TrimSuffix(content, "```")
		content = strings.TrimSpace(content)

		var result ReceiptResult
		if err := json.Unmarshal([]byte(content), &result); err != nil {
			log.Printf("⚠️ Failed to parse receipt JSON: %s", content)
			return nil, fmt.Errorf("failed to parse receipt data: %w", err)
		}

		log.Printf("✅ Receipt analyzed: %d items found", len(result.Items))
		return &result, nil
	}

	return nil, fmt.Errorf("all API keys exhausted: %w", lastErr)
}

// ExtractIntent uses Gemini to extract intent from text with automatic key rotation
func (g *GeminiClient) ExtractIntent(ctx context.Context, text string) (*Intent, error) {
	if len(g.apiKeys) == 0 {
		return nil, fmt.Errorf("Gemini API key not configured")
	}

	prompt := intentSystemPrompt + "\n\nUser message: " + text

	req := GeminiRequest{
		Contents: []GeminiContent{
			{
				Parts: []GeminiPart{
					{Text: prompt},
				},
			},
		},
	}

	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Try all API keys with rotation
	maxRetries := len(g.apiKeys)
	var lastErr error

	for attempt := 0; attempt < maxRetries; attempt++ {
		apiKey := g.getCurrentKey()

		url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=%s", apiKey)

		httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
		if err != nil {
			return nil, fmt.Errorf("failed to create request: %w", err)
		}
		httpReq.Header.Set("Content-Type", "application/json")

		resp, err := g.httpClient.Do(httpReq)
		if err != nil {
			lastErr = fmt.Errorf("failed to call Gemini API: %w", err)
			log.Printf("⚠️ Gemini API call failed (attempt %d/%d): %v", attempt+1, maxRetries, err)
			g.rotateKey()
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()

		if err != nil {
			lastErr = fmt.Errorf("failed to read response: %w", err)
			log.Printf("⚠️ Failed to read response (attempt %d/%d): %v", attempt+1, maxRetries, err)
			g.rotateKey()
			continue
		}

		var geminiResp GeminiResponse
		if err := json.Unmarshal(body, &geminiResp); err != nil {
			lastErr = fmt.Errorf("failed to parse response: %w", err)
			log.Printf("⚠️ Failed to parse response (attempt %d/%d): %v", attempt+1, maxRetries, err)
			g.rotateKey()
			continue
		}

		// Check for rate limit or quota errors
		if geminiResp.Error != nil {
			lastErr = fmt.Errorf("Gemini API error: %s", geminiResp.Error.Message)

			// Rotate key on rate limit (429) or quota exceeded (403)
			if geminiResp.Error.Code == 429 || geminiResp.Error.Code == 403 {
				log.Printf("⚠️ API key quota/rate limit (code %d, attempt %d/%d): %s",
					geminiResp.Error.Code, attempt+1, maxRetries, geminiResp.Error.Message)
				g.rotateKey()

				// Small delay before retry
				time.Sleep(time.Duration(attempt+1) * 100 * time.Millisecond)
				continue
			}

			// For other errors, don't retry
			return nil, lastErr
		}

		if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
			lastErr = fmt.Errorf("no response from Gemini")
			log.Printf("⚠️ No response from Gemini (attempt %d/%d)", attempt+1, maxRetries)
			g.rotateKey()
			continue
		}

		// Parse the JSON response
		content := geminiResp.Candidates[0].Content.Parts[0].Text

		// Clean up markdown code blocks if present
		content = strings.TrimPrefix(content, "```json\n")
		content = strings.TrimPrefix(content, "```\n")
		content = strings.TrimSuffix(content, "\n```")
		content = strings.TrimSpace(content)

		var intent Intent
		if err := json.Unmarshal([]byte(content), &intent); err != nil {
			log.Printf("⚠️ Failed to parse Gemini response: %s", content)
			// Return unknown intent as last resort
			return &Intent{
				Action:    "UNKNOWN",
				Entities:  map[string]any{},
				Sentiment: "neutral",
				Language:  "id",
				RawText:   text,
			}, nil
		}

		intent.RawText = text
		if attempt > 0 {
			log.Printf("✅ Intent extraction succeeded after %d retries", attempt)
		}
		return &intent, nil
	}

	// All keys exhausted
	log.Printf("❌ All %d API keys exhausted", len(g.apiKeys))
	return nil, fmt.Errorf("all API keys exhausted: %w", lastErr)
}
