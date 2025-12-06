package integrations

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/pasarsuara/backend/internal/database"
)

// WhatsAppBroadcaster handles mass messaging
type WhatsAppBroadcaster struct {
	db         *database.SupabaseClient
	kolosalURL string
	kolosalKey string
}

func NewWhatsAppBroadcaster(db *database.SupabaseClient, kolosalURL, kolosalKey string) *WhatsAppBroadcaster {
	return &WhatsAppBroadcaster{
		db:         db,
		kolosalURL: kolosalURL,
		kolosalKey: kolosalKey,
	}
}

// BroadcastRequest represents broadcast configuration
type BroadcastRequest struct {
	UserID      string   `json:"user_id"`
	Recipients  []string `json:"recipients"` // Phone numbers
	Message     string   `json:"message"`
	TemplateID  string   `json:"template_id,omitempty"`
	ScheduledAt string   `json:"scheduled_at,omitempty"`
}

// BroadcastResponse represents broadcast result
type BroadcastResponse struct {
	BroadcastID  string `json:"broadcast_id"`
	TotalSent    int    `json:"total_sent"`
	TotalFailed  int    `json:"total_failed"`
	Status       string `json:"status"`
	ScheduledFor string `json:"scheduled_for,omitempty"`
}

// SendBroadcast sends message to multiple recipients
func (w *WhatsAppBroadcaster) SendBroadcast(ctx context.Context, req *BroadcastRequest) (*BroadcastResponse, error) {
	log.Printf("📢 Sending broadcast to %d recipients", len(req.Recipients))

	broadcastID := fmt.Sprintf("broadcast_%d", time.Now().Unix())
	totalSent := 0
	totalFailed := 0

	// Send to each recipient
	for _, recipient := range req.Recipients {
		err := w.sendMessage(recipient, req.Message)
		if err != nil {
			log.Printf("❌ Failed to send to %s: %v", recipient, err)
			totalFailed++
		} else {
			totalSent++
		}

		// Rate limiting - 1 message per second
		time.Sleep(1 * time.Second)
	}

	// Log broadcast record (simplified for MVP)
	log.Printf("✅ Broadcast completed: %s - Sent: %d, Failed: %d", broadcastID, totalSent, totalFailed)

	return &BroadcastResponse{
		BroadcastID: broadcastID,
		TotalSent:   totalSent,
		TotalFailed: totalFailed,
		Status:      "COMPLETED",
	}, nil
}

// sendMessage sends a single message via Kolosal API
func (w *WhatsAppBroadcaster) sendMessage(recipient, message string) error {
	payload := map[string]interface{}{
		"phone_number": recipient,
		"message":      message,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", w.kolosalURL+"/send-message", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+w.kolosalKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to send message: status %d", resp.StatusCode)
	}

	return nil
}

// GetBroadcastTemplates returns pre-defined message templates
func (w *WhatsAppBroadcaster) GetBroadcastTemplates() []BroadcastTemplate {
	return []BroadcastTemplate{
		{
			ID:       "promo_discount",
			Name:     "Promo Diskon",
			Message:  "🎉 PROMO SPESIAL! Diskon {{discount}}% untuk {{product}}. Berlaku sampai {{date}}. Pesan sekarang!",
			Category: "MARKETING",
		},
		{
			ID:       "stock_alert",
			Name:     "Stok Terbatas",
			Message:  "⚠️ Stok {{product}} tinggal sedikit! Buruan pesan sebelum kehabisan. Hubungi kami sekarang!",
			Category: "MARKETING",
		},
		{
			ID:       "new_product",
			Name:     "Produk Baru",
			Message:  "✨ Produk baru! {{product}} sekarang tersedia dengan harga Rp {{price}}. Pesan sekarang juga!",
			Category: "MARKETING",
		},
		{
			ID:       "payment_reminder",
			Name:     "Pengingat Pembayaran",
			Message:  "🔔 Halo! Ini pengingat untuk pembayaran pesanan {{order_id}}. Total: Rp {{amount}}. Terima kasih!",
			Category: "TRANSACTIONAL",
		},
		{
			ID:       "thank_you",
			Name:     "Terima Kasih",
			Message:  "🙏 Terima kasih sudah berbelanja! Kami senang melayani Anda. Sampai jumpa lagi!",
			Category: "CUSTOMER_SERVICE",
		},
	}
}

// BroadcastTemplate represents a message template
type BroadcastTemplate struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Message  string `json:"message"`
	Category string `json:"category"`
}
