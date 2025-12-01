package api

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/pasarsuara/backend/internal/agents"
)

// WhatsAppWebhook handles incoming messages from WA Gateway
type WhatsAppWebhook struct {
	orchestrator *agents.AgentOrchestrator
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
	Success     bool                  `json:"success"`
	Message     string                `json:"message"`
	Reply       string                `json:"reply,omitempty"`
	AgentResult *agents.AgentResponse `json:"agent_result,omitempty"`
}

func NewWhatsAppWebhook(orchestrator *agents.AgentOrchestrator) *WhatsAppWebhook {
	return &WhatsAppWebhook{
		orchestrator: orchestrator,
	}
}

func (w *WhatsAppWebhook) Handle(rw http.ResponseWriter, r *http.Request) {
	var payload WebhookPayload

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(rw, "Invalid JSON", http.StatusBadRequest)
		return
	}

	log.Printf("📨 Webhook received: %s from %s", payload.Type, payload.From)

	var response WebhookResponse
	response.Success = true

	ctx := r.Context()

	switch payload.Type {
	case "text":
		text := payload.Payload.Text
		log.Printf("💬 Processing text: %s", text)

		// Process through Agent Orchestrator
		agentResult := w.orchestrator.ProcessMessage(ctx, payload.From, text)
		response.AgentResult = agentResult
		response.Reply = agentResult.Message
		response.Message = "Processed by Agent Orchestrator"

	case "audio":
		log.Printf("🎤 Audio message: %d seconds, voice: %v",
			payload.Payload.Duration, payload.Payload.IsVoice)

		// TODO: Implement audio processing with Gemini STT
		// For now, ask user to send text
		response.Message = "Audio received"
		response.Reply = "🎤 Voice note diterima!\n\nUntuk saat ini, mohon kirim pesan teks dulu ya. Fitur voice akan segera aktif!"

	default:
		response.Success = false
		response.Message = "Unsupported message type"
		response.Reply = "Maaf, jenis pesan ini belum didukung."
	}

	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(response)
}
