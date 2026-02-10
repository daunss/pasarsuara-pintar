package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/pasarsuara/wa-gateway/internal/config"
	"github.com/pasarsuara/wa-gateway/internal/handler"
	"github.com/pasarsuara/wa-gateway/internal/whatsapp"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Load config
	cfg := config.Load()

	log.Println("🚀 Suara Niaga Pintar WA Gateway starting...")
	log.Printf("📁 Session path: %s", cfg.SessionPath)
	log.Printf("🔗 Backend URL: %s", cfg.BackendURL)

	// Create context
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Create WhatsApp client
	waClient, err := whatsapp.NewClient(ctx, cfg.SessionPath)
	if err != nil {
		log.Fatalf("❌ Failed to create WhatsApp client: %v", err)
	}

	// Create message handler with waClient for replies
	msgHandler := handler.NewMessageHandler(cfg.BackendURL, waClient)
	waClient.SetMessageHandler(msgHandler.Handle)

	// Connect only if session already exists
	if err := waClient.Connect(ctx); err != nil {
		if errors.Is(err, whatsapp.ErrPairingRequired) {
			log.Println("ℹ️ Pairing required. Generating QR code...")
			qrCtx, cancelQR := context.WithTimeout(ctx, 30*time.Second)
			defer cancelQR()
			code, qrErr := waClient.StartPairing(qrCtx)
			if qrErr != nil {
				log.Printf("❌ Failed to start pairing: %v", qrErr)
			} else if code != "" {
				log.Printf("📱 WhatsApp QR code generated: %s", code)
			}
		} else {
			log.Printf("⚠️ WhatsApp not connected: %v", err)
			log.Println("ℹ️ Pairing required. Call POST /internal/qr to get a QR code.")
		}
	} else {
		log.Println("✅ WhatsApp Gateway is running!")
		log.Println("📱 Waiting for messages...")
	}

	// Start HTTP server for status and outbound messaging
	mux := http.NewServeMux()
	mux.Handle("/status", handler.HandleStatus(waClient))
	mux.Handle("/internal/send-message", handler.HandleSendMessage(waClient, cfg.APIKey))
	mux.Handle("/internal/qr", handler.HandleQRCode(waClient, cfg.APIKey))
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	server := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: mux,
	}

	go func() {
		log.Printf("✅ HTTP server listening on http://localhost:%s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("❌ HTTP server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	log.Println("\n👋 Shutting down...")
	ctxShutdown, cancelShutdown := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelShutdown()
	if err := server.Shutdown(ctxShutdown); err != nil {
		log.Printf("⚠️ HTTP server shutdown error: %v", err)
	}
	waClient.Disconnect()
	log.Println("✅ Disconnected from WhatsApp")
}
