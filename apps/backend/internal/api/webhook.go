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

		// Check if we have audio data
		if len(payload.Payload.AudioData) > 0 {
			mimeType := payload.Payload.MimeType
			if mimeType == "" {
				mimeType = "audio/ogg" // Default for WhatsApp voice notes
			}

			log.Printf("🎙️ Processing audio: %d bytes, %s", len(payload.Payload.AudioData), mimeType)

			// Process through Agent Orchestrator (will use Gemini STT + Kolosal)
			agentResult := w.orchestrator.ProcessAudio(ctx, payload.From, payload.Payload.AudioData, mimeType)
			response.AgentResult = agentResult
			response.Reply = agentResult.Message
			response.Message = "Audio processed successfully"
		} else {
			response.Message = "Audio received but no data"
			response.Reply = "🎤 Voice note diterima tapi data kosong. Coba kirim lagi ya!"
		}

	default:
		response.Success = false
		response.Message = "Unsupported message type"
		response.Reply = "Maaf, jenis pesan ini belum didukung."
	}

	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(response)
}
