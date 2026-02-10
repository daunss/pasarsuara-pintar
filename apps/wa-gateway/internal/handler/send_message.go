package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/pasarsuara/wa-gateway/internal/whatsapp"
)

type sendMessageRequest struct {
	To      string `json:"to"`
	Message string `json:"message"`
}

type sendMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

// HandleSendMessage sends outbound WhatsApp messages via the connected client.
func HandleSendMessage(client *whatsapp.Client, apiKey string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		if apiKey != "" {
			provided := strings.TrimSpace(r.Header.Get("X-API-Key"))
			if provided == "" || provided != apiKey {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}
		}

		var req sendMessageRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid payload", http.StatusBadRequest)
			return
		}

		if req.To == "" || req.Message == "" {
			http.Error(w, "Missing to/message", http.StatusBadRequest)
			return
		}

		if client == nil || !client.IsConnected() {
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(sendMessageResponse{Success: false, Error: "WhatsApp not connected"})
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		if err := client.SendText(ctx, req.To, req.Message); err != nil {
			w.WriteHeader(http.StatusBadGateway)
			json.NewEncoder(w).Encode(sendMessageResponse{Success: false, Error: err.Error()})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(sendMessageResponse{Success: true})
	}
}
