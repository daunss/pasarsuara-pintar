package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// KolosalClient handles intent extraction using Kolosal AI
type KolosalClient struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

// Intent represents extracted intent from user message
type Intent struct {
	Action    string         `json:"action"`    // ORDER_RESTOCK, RECORD_SALE, REQUEST_PROMO, ASK_MARKET, UNKNOWN
	Entities  map[string]any `json:"entities"`  // product, qty, price, time, etc
	Sentiment string         `json:"sentiment"` // positive, negative, neutral
	Language  string         `json:"language"`  // id, jv, su
	RawText   string         `json:"raw_text"`
}

type KolosalRequest struct {
	Model    string           `json:"model"`
	Messages []KolosalMessage `json:"messages"`
}

type KolosalMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type KolosalResponse struct {
	ID      string `json:"id"`
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

const intentSystemPrompt = `You are an Intent Extraction Engine for PasarSuara, a voice-first business OS for Indonesian UMKM (small businesses).

Your task is to analyze informal Indonesian/Javanese/Sundanese text and extract structured intent.

IMPORTANT: Always respond with valid JSON only, no other text.

Available intents:
- ORDER_RESTOCK: User wants to order/buy supplies (e.g., "cari beras 25 kilo", "butuh minyak goreng")
- RECORD_SALE: User recording a sale transaction (e.g., "tadi laku nasi 10 porsi", "payu bakso 5 mangkok")
- RECORD_EXPENSE: User recording an expense (e.g., "beli gas 2 tabung", "bayar listrik")
- REQUEST_PROMO: User wants promotional content (e.g., "buatkan promosi", "mau bikin iklan")
- ASK_MARKET: User asking about market/price info (e.g., "harga cabai berapa", "tren harga beras")
- CHECK_STOCK: User checking inventory (e.g., "stok beras berapa", "sisa telur ada berapa")
- GREETING: Simple greeting (e.g., "halo", "selamat pagi")
- UNKNOWN: Cannot determine intent

Response format:
{
  "action": "INTENT_NAME",
  "entities": {
    "product": "product name if mentioned",
    "qty": number if mentioned,
    "unit": "kg/liter/porsi/etc if mentioned",
    "price": number if mentioned,
    "max_price": number if budget mentioned,
    "time": "delivery time if mentioned"
  },
  "sentiment": "positive/negative/neutral",
  "language": "id/jv/su (detected language)"
}

Examples:
Input: "Mas, cari beras 25 kilo maksimal 12 ribu ya"
Output: {"action":"ORDER_RESTOCK","entities":{"product":"beras","qty":25,"unit":"kg","max_price":12000},"sentiment":"neutral","language":"id"}

Input: "Tadi laku nasi rames limolas porsi, rolas ewu siji"
Output: {"action":"RECORD_SALE","entities":{"product":"nasi rames","qty":15,"unit":"porsi","price":12000},"sentiment":"positive","language":"jv"}

Input: "Halo mas"
Output: {"action":"GREETING","entities":{},"sentiment":"positive","language":"id"}`

func NewKolosalClient(apiKey, baseURL string) *KolosalClient {
	if baseURL == "" {
		baseURL = "https://api.kolosal.ai/v1"
	}
	return &KolosalClient{
		apiKey:  apiKey,
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// ExtractIntent analyzes text and returns structured intent
func (k *KolosalClient) ExtractIntent(ctx context.Context, text string) (*Intent, error) {
	if k.apiKey == "" {
		return nil, fmt.Errorf("Kolosal API key not configured")
	}

	req := KolosalRequest{
		Model: "kolosal-1-full",
		Messages: []KolosalMessage{
			{Role: "system", Content: intentSystemPrompt},
			{Role: "user", Content: text},
		},
	}

	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/chat/completions", k.baseURL)
	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", k.apiKey))

	resp, err := k.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to call Kolosal API: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var kolosalResp KolosalResponse
	if err := json.Unmarshal(body, &kolosalResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if kolosalResp.Error != nil {
		return nil, fmt.Errorf("Kolosal API error: %s", kolosalResp.Error.Message)
	}

	if len(kolosalResp.Choices) == 0 {
		return nil, fmt.Errorf("no response from Kolosal")
	}

	// Parse the JSON response from LLM
	var intent Intent
	content := kolosalResp.Choices[0].Message.Content
	if err := json.Unmarshal([]byte(content), &intent); err != nil {
		// If parsing fails, return unknown intent
		return &Intent{
			Action:    "UNKNOWN",
			Entities:  map[string]any{},
			Sentiment: "neutral",
			Language:  "id",
			RawText:   text,
		}, nil
	}

	intent.RawText = text
	return &intent, nil
}
