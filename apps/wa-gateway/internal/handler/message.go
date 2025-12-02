package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
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
	MimeType  string `json:"mime_type,omitempty"`
	IsVoice   bool   `json:"is_voice,omitempty"`
	Duration  uint32 `json:"duration,omitempty"`
}

// WebhookResponse is the response from backend
type WebhookResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Reply   string `json:"reply,omitempty"`
}

type MessageHandler struct {
	backendURL string
	waClient   *whatsapp.Client
	httpClient *http.Client
}

func NewMessageHandler(backendURL string, waClient *whatsapp.Client) *MessageHandler {
	return &MessageHandler{
		backendURL: backendURL,
		waClient:   waClient,
		httpClient: &http.Client{
			Timeout: 60 * time.Second, // Longer timeout for AI processing
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
	senderJID := evt.Info.Sender

	log.Printf("📩 Message from %s", sender)

	// Determine message type and extract content
	var payload WebhookPayload
	payload.Event = "message"
	payload.From = sender

	if whatsapp.IsAudioMessage(msg) {
		// Audio/Voice message
		mimetype, seconds, isPTT := whatsapp.GetAudioInfo(msg)

		log.Printf("🎤 Voice note: %s, %d seconds, PTT: %v", mimetype, seconds, isPTT)

		// Download audio
		audioData, err := h.waClient.DownloadAudio(context.Background(), msg)
		if err != nil {
			log.Printf("❌ Failed to download audio: %v", err)
			go h.sendReply(senderJID.String(), "Maaf, gagal mengunduh voice note. Coba kirim lagi atau kirim pesan teks ya!")
			return
		}

		log.Printf("✅ Audio downloaded: %d bytes", len(audioData))

		payload.Type = "audio"
		payload.Payload = MessagePayload{
			AudioData: audioData,
			MimeType:  mimetype,
			IsVoice:   isPTT,
			Duration:  seconds,
		}

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

	// Send to backend webhook and get reply
	go h.processAndReply(payload, senderJID.String())
}

func (h *MessageHandler) processAndReply(payload WebhookPayload, senderJID string) {
	// Send to backend
	reply, err := h.sendToBackend(payload)
	if err != nil {
		log.Printf("❌ Backend error: %v", err)
		h.sendReply(senderJID, "Maaf, ada kendala teknis. Coba lagi ya! 🙏")
		return
	}

	// Send reply to user
	if reply != "" {
		h.sendReply(senderJID, reply)
	}
}

func (h *MessageHandler) sendToBackend(payload WebhookPayload) (string, error) {
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal payload: %w", err)
	}

	url := fmt.Sprintf("%s/internal/webhook/whatsapp", h.backendURL)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := h.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send to backend: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	log.Printf("✅ Backend response: %s", resp.Status)

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("backend error: %s", string(body))
	}

	// Parse response
	var webhookResp WebhookResponse
	if err := json.Unmarshal(body, &webhookResp); err != nil {
		log.Printf("⚠️ Failed to parse response: %v", err)
		return "", nil
	}

	return webhookResp.Reply, nil
}

func (h *MessageHandler) sendReply(jid string, text string) {
	if h.waClient == nil {
		log.Printf("⚠️ WA client not set, cannot send reply")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err := h.waClient.SendText(ctx, jid, text)
	if err != nil {
		log.Printf("❌ Failed to send reply: %v", err)
	} else {
		log.Printf("📤 Reply sent to %s", jid)
	}
}
