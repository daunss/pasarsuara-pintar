package api

import (
	"encoding/json"
	"log"
	"net/http"
)

// WhatsAppWebhook handles incoming messages from WA Gateway
type WhatsAppWebhook struct{}

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
	MediaKey  string `json:"media_key,omitempty"`
	IsVoice   bool   `json:"is_voice,omitempty"`
	Duration  uint32 `json:"duration,omitempty"`
}

type WebhookResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Reply   string `json:"reply,omitempty"`
}

func NewWhatsAppWebhook() *WhatsAppWebhook {
	return &WhatsAppWebhook{}
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

	switch payload.Type {
	case "text":
		response = w.handleTextMessage(payload)
	case "audio":
		response = w.handleAudioMessage(payload)
	default:
		response = WebhookResponse{
			Success: false,
			Message: "Unsupported message type",
		}
	}

	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(response)
}

func (w *WhatsAppWebhook) handleTextMessage(payload WebhookPayload) WebhookResponse {
	text := payload.Payload.Text
	log.Printf("💬 Processing text: %s", text)

	// TODO: Phase 3 - Send to Intent Engine (Kolosal)
	// For now, just echo back

	return WebhookResponse{
		Success: true,
		Message: "Text message received",
		Reply:   "Halo! Saya PasarSuara. Pesan kamu sudah diterima: " + text,
	}
}

func (w *WhatsAppWebhook) handleAudioMessage(payload WebhookPayload) WebhookResponse {
	log.Printf("🎤 Processing audio: %d seconds, voice: %v",
		payload.Payload.Duration, payload.Payload.IsVoice)

	// TODO: Phase 3 - Send to Gemini STT then Kolosal Intent

	return WebhookResponse{
		Success: true,
		Message: "Audio message received",
		Reply:   "Voice note diterima! Fitur STT akan segera aktif.",
	}
}
