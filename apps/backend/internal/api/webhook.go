package api

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/pasarsuara/backend/internal/ai"
)

// WhatsAppWebhook handles incoming messages from WA Gateway
type WhatsAppWebhook struct {
	intentEngine *ai.IntentEngine
}

// WebhookPayload matches the payload from WA Gateway
type WebhookPayload struct {
	Event   string         `json:"event"`
	From    string         `json:"from"`
	Type    string         `json:"type"`
	Payload MessagePayload `json:"payload"`
}

type MessagePayload struct {
	Text      string `json:"text,omitempty"`
	AudioURL  string `json:"audio_url,omitempty"`
	AudioData []byte `json:"audio_data,omitempty"`
	MimeType  string `json:"mime_type,omitempty"`
	IsVoice   bool   `json:"is_voice,omitempty"`
	Duration  uint32 `json:"duration,omitempty"`
}

type WebhookResponse struct {
	Success bool       `json:"success"`
	Message string     `json:"message"`
	Reply   string     `json:"reply,omitempty"`
	Intent  *ai.Intent `json:"intent,omitempty"`
}

func NewWhatsAppWebhook(intentEngine *ai.IntentEngine) *WhatsAppWebhook {
	return &WhatsAppWebhook{
		intentEngine: intentEngine,
	}
}

func (w *WhatsAppWebhook) Handle(rw http.ResponseWriter, r *http.Request) {
	var payload WebhookPayload

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(rw, "Invalid JSON", http.StatusBadRequest)
		return
	}

	log.Printf("📨 Webhook received: %s from %s", payload.Type, payload.From)

	// Process based on message type
	var response WebhookResponse
	response.Success = true

	ctx := r.Context()

	switch payload.Type {
	case "text":
		text := payload.Payload.Text
		log.Printf("💬 Processing text: %s", text)

		// Extract intent using Kolosal
		intent, err := w.intentEngine.ProcessText(ctx, text)
		if err != nil {
			log.Printf("⚠️ Intent extraction failed: %v", err)
			response.Message = "Message received but intent extraction failed"
			response.Reply = "Maaf, ada kendala teknis. Coba lagi ya!"
		} else {
			response.Message = "Intent extracted successfully"
			response.Intent = intent
			response.Reply = w.intentEngine.GenerateResponse(intent)
		}

	case "audio":
		log.Printf("🎤 Audio message: %d seconds, voice: %v",
			payload.Payload.Duration, payload.Payload.IsVoice)

		// Check if we have audio data
		if len(payload.Payload.AudioData) > 0 {
			mimeType := payload.Payload.MimeType
			if mimeType == "" {
				mimeType = "audio/ogg" // Default for WhatsApp voice notes
			}

			intent, err := w.intentEngine.ProcessAudio(ctx, payload.Payload.AudioData, mimeType)
			if err != nil {
				log.Printf("⚠️ Audio processing failed: %v", err)
				response.Message = "Audio received but processing failed"
				response.Reply = "Maaf, voice note belum bisa diproses. Coba kirim pesan teks ya!"
			} else {
				response.Message = "Audio processed successfully"
				response.Intent = intent
				response.Reply = w.intentEngine.GenerateResponse(intent)
			}
		} else {
			response.Message = "Audio message received"
			response.Reply = "Voice note diterima! Untuk saat ini, coba kirim pesan teks dulu ya."
		}

	default:
		response.Success = false
		response.Message = "Unsupported message type"
		response.Reply = "Maaf, jenis pesan ini belum didukung."
	}

	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(response)
}
