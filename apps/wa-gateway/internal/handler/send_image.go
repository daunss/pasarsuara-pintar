package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/pasarsuara/wa-gateway/internal/whatsapp"
)

type sendImageRequest struct {
	To       string `json:"to"`
	ImageURL string `json:"image_url"`
	Caption  string `json:"caption"`
}

// HandleSendImage downloads an image from URL and sends it via WhatsApp.
func HandleSendImage(client *whatsapp.Client, apiKey string) http.HandlerFunc {
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

		var req sendImageRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid payload", http.StatusBadRequest)
			return
		}

		if req.To == "" || req.ImageURL == "" {
			http.Error(w, "Missing to/image_url", http.StatusBadRequest)
			return
		}

		if client == nil || !client.IsConnected() {
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(sendMessageResponse{Success: false, Error: "WhatsApp not connected"})
			return
		}

		// Download image from URL
		log.Printf("📷 Downloading image from: %s", req.ImageURL)
		httpClient := &http.Client{Timeout: 15 * time.Second}
		imgResp, err := httpClient.Get(req.ImageURL)
		if err != nil {
			log.Printf("❌ Failed to download image: %v", err)
			w.WriteHeader(http.StatusBadGateway)
			json.NewEncoder(w).Encode(sendMessageResponse{Success: false, Error: fmt.Sprintf("failed to download image: %v", err)})
			return
		}
		defer imgResp.Body.Close()

		if imgResp.StatusCode >= 400 {
			log.Printf("❌ Image download returned status: %d", imgResp.StatusCode)
			w.WriteHeader(http.StatusBadGateway)
			json.NewEncoder(w).Encode(sendMessageResponse{Success: false, Error: fmt.Sprintf("image download error: %s", imgResp.Status)})
			return
		}

		imageData, err := io.ReadAll(imgResp.Body)
		if err != nil {
			log.Printf("❌ Failed to read image data: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(sendMessageResponse{Success: false, Error: "failed to read image"})
			return
		}

		log.Printf("📷 Sending image (%d bytes) to %s", len(imageData), req.To)

		ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
		defer cancel()

		if err := client.SendImage(ctx, req.To, imageData, req.Caption); err != nil {
			log.Printf("❌ Failed to send image: %v", err)
			w.WriteHeader(http.StatusBadGateway)
			json.NewEncoder(w).Encode(sendMessageResponse{Success: false, Error: err.Error()})
			return
		}

		log.Printf("✅ Image sent to %s", req.To)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(sendMessageResponse{Success: true})
	}
}
