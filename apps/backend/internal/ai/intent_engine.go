package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

// IntentEngine orchestrates STT and intent extraction
type IntentEngine struct {
	gemini     *GeminiClient
	kolosal    *KolosalClient
	geminiKey  string
	kolosalKey string
	kolosalURL string
}

func NewIntentEngine(geminiKey, kolosalKey, kolosalURL string) *IntentEngine {
	return &IntentEngine{
		gemini:     NewGeminiClient(geminiKey),
		kolosal:    NewKolosalClient(kolosalKey, kolosalURL),
		geminiKey:  geminiKey,
		kolosalKey: kolosalKey,
		kolosalURL: kolosalURL,
	}
}

// ProcessText extracts intent from text message
func (e *IntentEngine) ProcessText(ctx context.Context, text string) (*Intent, error) {
	log.Printf("🧠 Processing text: %s", text)

	// Normalize text first (handle "15rb", "25kg", etc)
	normalizedText := NormalizeText(text)
	if normalizedText != text {
		log.Printf("📝 Normalized: %s → %s", text, normalizedText)
	}

	// Try Kolosal first
	intent, err := e.kolosal.ExtractIntent(ctx, normalizedText)
	if err != nil {
		log.Printf("⚠️ Kolosal failed (%v), using Gemini fallback...", err)
		// Fallback to Gemini
		intent, err = e.extractIntentWithGemini(ctx, normalizedText)
		if err != nil {
			log.Printf("❌ Gemini fallback also failed: %v", err)
			return nil, err
		}
		log.Printf("✅ Gemini fallback success!")
	}

	// Store original text
	intent.RawText = text

	log.Printf("✅ Intent: %s, Entities: %v", intent.Action, intent.Entities)
	return intent, nil
}

// ProcessAudio transcribes audio then extracts intent
func (e *IntentEngine) ProcessAudio(ctx context.Context, audioData []byte, mimeType string) (*Intent, error) {
	log.Printf("🎤 Processing audio (%d bytes, %s)", len(audioData), mimeType)

	// Step 1: Transcribe audio to text
	transcript, err := e.gemini.TranscribeAudio(ctx, audioData, mimeType)
	if err != nil {
		log.Printf("❌ Transcription failed: %v", err)
		return nil, err
	}

	log.Printf("📝 Transcript: %s", transcript)

	// Step 2: Extract intent from transcript (with fallback)
	intent, err := e.kolosal.ExtractIntent(ctx, transcript)
	if err != nil {
		log.Printf("⚠️ Kolosal failed (%v), using Gemini fallback...", err)
		// Fallback to Gemini
		intent, err = e.extractIntentWithGemini(ctx, transcript)
		if err != nil {
			log.Printf("❌ Gemini fallback also failed: %v", err)
			return nil, err
		}
		log.Printf("✅ Gemini fallback success!")
	}

	log.Printf("✅ Intent: %s, Entities: %v", intent.Action, intent.Entities)
	return intent, nil
}

// extractIntentWithGemini uses Gemini as fallback for intent extraction
func (e *IntentEngine) extractIntentWithGemini(ctx context.Context, text string) (*Intent, error) {
	if e.geminiKey == "" {
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

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=%s", e.geminiKey)

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to call Gemini API: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var geminiResp GeminiResponse
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if geminiResp.Error != nil {
		return nil, fmt.Errorf("Gemini API error: %s", geminiResp.Error.Message)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no response from Gemini")
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
	return &intent, nil
}

// GenerateResponse creates a response based on intent
func (e *IntentEngine) GenerateResponse(intent *Intent) string {
	switch intent.Action {
	case "GREETING":
		return "Halo! Saya PasarSuara, asisten bisnis Anda. Ada yang bisa saya bantu? 😊"

	case "ORDER_RESTOCK":
		product := getStringEntity(intent.Entities, "product")
		qty := getFloatEntity(intent.Entities, "qty")
		unit := getStringEntity(intent.Entities, "unit")
		maxPrice := getFloatEntity(intent.Entities, "max_price")

		response := "🛒 Pesanan restock diterima!\n"
		if product != "" {
			response += "Produk: " + product + "\n"
		}
		if qty > 0 {
			response += "Jumlah: " + formatNumber(qty)
			if unit != "" {
				response += " " + unit
			}
			response += "\n"
		}
		if maxPrice > 0 {
			response += "Budget maks: Rp " + formatNumber(maxPrice) + "/unit\n"
		}
		response += "\n🤖 Buyer Agent sedang mencari supplier terbaik untuk Anda..."
		return response

	case "RECORD_SALE":
		product := getStringEntity(intent.Entities, "product")
		qty := getFloatEntity(intent.Entities, "qty")
		price := getFloatEntity(intent.Entities, "price")

		total := qty * price
		response := "✅ Penjualan tercatat!\n"
		if product != "" {
			response += "Produk: " + product + "\n"
		}
		if qty > 0 {
			response += "Jumlah: " + formatNumber(qty) + "\n"
		}
		if price > 0 {
			response += "Harga: Rp " + formatNumber(price) + "\n"
		}
		if total > 0 {
			response += "Total: Rp " + formatNumber(total) + "\n"
		}
		return response

	case "RECORD_EXPENSE":
		product := getStringEntity(intent.Entities, "product")
		qty := getFloatEntity(intent.Entities, "qty")
		price := getFloatEntity(intent.Entities, "price")

		response := "💸 Pengeluaran tercatat!\n"
		if product != "" {
			response += "Item: " + product + "\n"
		}
		if qty > 0 {
			response += "Jumlah: " + formatNumber(qty) + "\n"
		}
		if price > 0 {
			response += "Biaya: Rp " + formatNumber(price) + "\n"
		}
		return response

	case "REQUEST_PROMO":
		return "🎨 Baik, saya akan buatkan materi promosi untuk Anda!\nMohon tunggu sebentar..."

	case "ASK_MARKET":
		product := getStringEntity(intent.Entities, "product")
		if product != "" {
			return "📊 Mencari info harga " + product + " di pasar...\n(Fitur Market Intel akan segera aktif)"
		}
		return "📊 Apa yang ingin Anda ketahui tentang pasar?"

	case "CHECK_STOCK":
		product := getStringEntity(intent.Entities, "product")
		if product != "" {
			return "📦 Mengecek stok " + product + "...\n(Fitur cek stok akan segera aktif)"
		}
		return "📦 Produk apa yang ingin dicek stoknya?"

	default:
		return "🤔 Maaf, saya belum mengerti maksud Anda.\n\nAnda bisa:\n• Catat penjualan: \"Tadi laku nasi 10 porsi\"\n• Pesan barang: \"Cari beras 25 kg\"\n• Minta promosi: \"Buatkan promosi warung\""
	}
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

func formatNumber(n float64) string {
	if n == float64(int(n)) {
		return fmt.Sprintf("%.0f", n)
	}
	return fmt.Sprintf("%.2f", n)
}
