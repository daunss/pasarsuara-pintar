package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

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

	log.Println("🚀 PasarSuara WA Gateway starting...")
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

	// Create message handler
	msgHandler := handler.NewMessageHandler(cfg.BackendURL)
	waClient.SetMessageHandler(msgHandler.Handle)

	// Connect to WhatsApp
	if err := waClient.Connect(ctx); err != nil {
		log.Fatalf("❌ Failed to connect to WhatsApp: %v", err)
	}

	log.Println("✅ WhatsApp Gateway is running!")
	log.Println("📱 Waiting for messages...")

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	log.Println("\n👋 Shutting down...")
	waClient.Disconnect()
	log.Println("✅ Disconnected from WhatsApp")
}
