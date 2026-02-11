package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/pasarsuara/backend/internal/agents"
)

// WhatsAppWebhook handles incoming messages from WA Gateway
type WhatsAppWebhook struct {
	orchestrator  *agents.AgentOrchestrator
	messageRouter MessageRouterInterface
}

// MessageRouterInterface defines the interface for message routing
type MessageRouterInterface interface {
	RouteMessage(phoneNumber, message string) (string, error)
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
		orchestrator:  orchestrator,
		messageRouter: nil, // Will be set via SetMessageRouter
	}
}

// SetMessageRouter sets the message router for the webhook
func (w *WhatsAppWebhook) SetMessageRouter(router MessageRouterInterface) {
	w.messageRouter = router
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

		// Handle supplier replies for active negotiations
		if w.orchestrator != nil {
			handled, reply := w.orchestrator.HandleSupplierMessage(ctx, payload.From, text)
			if handled {
				response.Reply = reply
				response.Message = "Processed supplier message"
				break
			}
		}

		// Try message router first (for registration, ambiguity, categorization)
		if w.messageRouter != nil {
			routerResponse, err := w.messageRouter.RouteMessage(payload.From, text)
			if err != nil {
				log.Printf("⚠️ Message router error: %v, falling back to orchestrator", err)
			} else if routerResponse != "" {
				// Router handled the message
				response.Reply = routerResponse
				response.Message = "Processed by Message Router"
				break
			}
		}

		// Fallback to Agent Orchestrator for complex processing
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

	case "image":
		log.Printf("📷 Image message from %s", payload.From)

		caption := payload.Payload.Text
		imageData := payload.Payload.AudioData // Reused field

		if len(imageData) > 0 {
			log.Printf("🖼️ Processing image: %d bytes, caption: %s", len(imageData), caption)

			mimeType := "image/jpeg"
			if payload.Payload.MimeType != "" {
				mimeType = payload.Payload.MimeType
			}

			// Process image through Agent Orchestrator (Gemini Vision OCR)
			agentResult := w.orchestrator.ProcessImage(ctx, payload.From, imageData, mimeType, caption)
			response.AgentResult = agentResult
			response.Reply = agentResult.Message
			response.Message = "Image processed successfully"
		} else {
			response.Reply = "📷 Gambar diterima tapi data kosong. Coba kirim lagi ya!"
		}

	case "document":
		log.Printf("📄 Document message from %s", payload.From)

		filename := payload.Payload.Text
		docData := payload.Payload.AudioData // Reused field

		if len(docData) > 0 {
			log.Printf("📋 Document received: %s (%d bytes)", filename, len(docData))

			// For now, just acknowledge receipt
			// TODO: OCR for receipts, Excel import, etc.
			response.Message = "Document received"
			response.Reply = fmt.Sprintf("📄 Dokumen \"%s\" diterima!\n\nFitur import data akan segera aktif.", filename)
		} else {
			response.Reply = "📄 Dokumen diterima tapi data kosong. Coba kirim lagi ya!"
		}

	default:
		response.Success = false
		response.Message = "Unsupported message type"
		response.Reply = "Maaf, jenis pesan ini belum didukung."
	}

	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(response)
}
