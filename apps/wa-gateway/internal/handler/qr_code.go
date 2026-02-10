package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/pasarsuara/wa-gateway/internal/whatsapp"
)

type qrCodeResponse struct {
	Success bool   `json:"success"`
	Code    string `json:"code,omitempty"`
	Error   string `json:"error,omitempty"`
}

// HandleQRCode generates a QR code string for manual WhatsApp pairing.
func HandleQRCode(client *whatsapp.Client, apiKey string) http.HandlerFunc {
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

		if client == nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(qrCodeResponse{Success: false, Error: "WhatsApp client not initialized"})
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
		defer cancel()

		code, err := client.StartPairing(ctx)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(qrCodeResponse{Success: false, Error: err.Error()})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(qrCodeResponse{Success: true, Code: code})
	}
}
