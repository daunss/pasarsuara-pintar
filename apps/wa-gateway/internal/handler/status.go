package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/pasarsuara/wa-gateway/internal/whatsapp"
)

type StatusResponse struct {
	Connected   bool   `json:"connected"`
	PhoneNumber string `json:"phone_number,omitempty"`
	LastSeen    string `json:"last_seen,omitempty"`
	Error       string `json:"error,omitempty"`
}

func HandleStatus(client *whatsapp.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		w.Header().Set("Content-Type", "application/json")

		// Check if client is connected
		if client == nil || !client.IsConnected() {
			json.NewEncoder(w).Encode(StatusResponse{
				Connected: false,
				Error:     "WhatsApp not connected",
			})
			return
		}

		// Get phone number
		phoneNumber := client.GetPhoneNumber()

		json.NewEncoder(w).Encode(StatusResponse{
			Connected:   true,
			PhoneNumber: phoneNumber,
			LastSeen:    time.Now().Format(time.RFC3339),
		})
	}
}
