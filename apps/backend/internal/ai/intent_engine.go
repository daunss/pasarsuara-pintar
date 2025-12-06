package ai

import (
	"context"
	"fmt"
	"log"
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
// This method delegates to GeminiClient which handles key rotation automatically
func (e *IntentEngine) extractIntentWithGemini(ctx context.Context, text string) (*Intent, error) {
	// Use the gemini client's built-in key rotation by making a text-based request
	// We'll create a helper method in GeminiClient for this
	return e.gemini.ExtractIntent(ctx, text)
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
