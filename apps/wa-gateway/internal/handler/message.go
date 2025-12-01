package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/pasarsuara/wa-gateway/internal/whatsapp"
	"go.mau.fi/whatsmeow/types/events"
)

// WebhookPayload is the payload sent to backend
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

type MessageHandler struct {
	backendURL string
	httpClient *http.Client
}

func NewMessageHandler(backendURL string) *MessageHandler {
	return &MessageHandler{
		backendURL: backendURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (h *MessageHandler) Handle(evt *events.Message) {
	// Skip messages from self
	if evt.Info.IsFromMe {
		return
	}

	// Skip group messages for now (focus on personal chat)
	if evt.Info.IsGroup {
		return
	}

	msg := evt.Message
	sender := evt.Info.Sender.User

	log.Printf("📩 Message from %s", sender)

	// Determine message type and extract content
	var payload WebhookPayload
	payload.Event = "message"
	payload.From = sender

	if whatsapp.IsAudioMessage(msg) {
		// Audio/Voice message
		mimetype, seconds, isPTT := whatsapp.GetAudioInfo(msg)

		payload.Type = "audio"
		payload.Payload = MessagePayload{
			IsVoice:  isPTT,
			Duration: seconds,
		}

		log.Printf("🎤 Voice note: %s, %d seconds, PTT: %v", mimetype, seconds, isPTT)

		// TODO: Download audio and send to backend for STT
		// For now, we'll handle this in Phase 3

	} else {
		// Text message
		text := whatsapp.ExtractTextFromMessage(msg)
		if text == "" {
			log.Println("⚠️ Empty or unsupported message type")
			return
		}

		payload.Type = "text"
		payload.Payload = MessagePayload{
			Text: text,
		}

		log.Printf("💬 Text: %s", text)
	}

	// Send to backend webhook
	go h.sendToBackend(payload)
}

func (h *MessageHandler) sendToBackend(payload WebhookPayload) {
	jsonData, err := json.Marshal(payload)
	if err != nil {
		log.Printf("❌ Failed to marshal payload: %v", err)
		return
	}

	url := fmt.Sprintf("%s/internal/webhook/whatsapp", h.backendURL)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("❌ Failed to create request: %v", err)
		return
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := h.httpClient.Do(req)
	if err != nil {
		log.Printf("❌ Failed to send to backend: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		log.Printf("✅ Sent to backend: %s", resp.Status)
	} else {
		log.Printf("⚠️ Backend response: %s", resp.Status)
	}
}
