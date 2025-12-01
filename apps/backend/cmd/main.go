package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/pasarsuara/backend/internal/ai"
	"github.com/pasarsuara/backend/internal/api"
	"github.com/pasarsuara/backend/internal/config"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Load config
	cfg := config.Load()

	log.Println("🚀 PasarSuara Backend starting...")
	log.Printf("🔌 Port: %s", cfg.Port)

	// Check API keys
	if cfg.KolosalAPIKey == "" {
		log.Println("⚠️ KOLOSAL_API_KEY not set - intent extraction will fail")
	} else {
		log.Println("✅ Kolosal API configured")
	}

	if cfg.GeminiAPIKey == "" {
		log.Println("⚠️ GEMINI_API_KEY not set - audio transcription will fail")
	} else {
		log.Println("✅ Gemini API configured")
	}

	// Create Intent Engine
	intentEngine := ai.NewIntentEngine(
		cfg.GeminiAPIKey,
		cfg.KolosalAPIKey,
		cfg.KolosalBaseURL,
	)

	// Create router
	router := api.NewRouter(intentEngine)

	// Create server
	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second, // Longer for AI processing
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Printf("✅ Server listening on http://localhost:%s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("❌ Server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	log.Println("\n👋 Shutting down server...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("❌ Server shutdown error: %v", err)
	}

	log.Println("✅ Server stopped")
}
