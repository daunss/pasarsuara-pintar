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
	"github.com/pasarsuara/backend/internal/agents"
	"github.com/pasarsuara/backend/internal/ai"
	"github.com/pasarsuara/backend/internal/api"
	"github.com/pasarsuara/backend/internal/config"
	appcontext "github.com/pasarsuara/backend/internal/context"
	"github.com/pasarsuara/backend/internal/database"
	"github.com/pasarsuara/backend/internal/handlers"
	"github.com/pasarsuara/backend/internal/integrations"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Load config
	cfg := config.Load()

	log.Println("🚀 Suara Niaga Pintar Backend starting...")
	log.Printf("🔌 Port: %s", cfg.Port)

	// Initialize database client
	var db *database.SupabaseClient
	if cfg.SupabaseURL != "" && cfg.SupabaseKey != "" {
		db = database.NewSupabaseClient(cfg.SupabaseURL, cfg.SupabaseKey)
		log.Println("✅ Supabase database configured")
	} else {
		log.Println("⚠️ Supabase not configured - using demo mode")
	}

	// Check API keys
	var kolosalClient *ai.KolosalClient
	if cfg.KolosalAPIKey == "" {
		log.Println("⚠️ KOLOSAL_API_KEY not set - intent extraction will fail")
	} else {
		kolosalClient = ai.NewKolosalClient(cfg.KolosalAPIKey, cfg.KolosalBaseURL)
		log.Println("✅ Kolosal API configured")
	}

	if cfg.GeminiAPIKey == "" {
		log.Println("⚠️ GEMINI_API_KEY not set - audio transcription will fail")
	} else {
		// Log first 20 chars of API key for debugging
		keyPreview := cfg.GeminiAPIKey
		if len(keyPreview) > 20 {
			keyPreview = keyPreview[:20] + "..."
		}
		log.Printf("✅ Gemini API configured (key: %s)", keyPreview)
	}

	// Create Intent Engine
	intentEngine := ai.NewIntentEngine(
		cfg.GeminiAPIKey,
		cfg.KolosalAPIKey,
		cfg.KolosalBaseURL,
	)

	// Create Conversation Manager (30 min TTL)
	contextMgr := appcontext.NewConversationManager(30 * time.Minute)
	log.Println("✅ Conversation Manager initialized")

	// Create WA Gateway sender (for outbound supplier negotiation)
	var waSender agents.WhatsAppSender
	if cfg.WAGatewayURL != "" {
		waSender = integrations.NewWAGatewayClient(cfg.WAGatewayURL, cfg.WAGatewayKey)
		log.Println("✅ WA Gateway client configured")
	} else {
		log.Println("⚠️ WA Gateway not configured - outbound WhatsApp disabled")
	}

	// Create Midtrans client for QRIS
	var qrisClient agents.QrisPaymentClient
	if cfg.MidtransServerKey != "" {
		qrisClient = integrations.NewMidtransClient(cfg.MidtransServerKey, cfg.MidtransIsProduction)
		log.Println("✅ Midtrans QRIS client configured")
	} else {
		log.Println("⚠️ MIDTRANS_SERVER_KEY not set - QRIS payments disabled")
	}

	// Create Agent Orchestrator
	orchestrator := agents.NewAgentOrchestrator(db, intentEngine, kolosalClient, cfg.KolosalAPIKey, cfg.KolosalBaseURL, cfg.GeminiAPIKey, contextMgr, waSender, qrisClient)

	// Create Catalog Handler
	catalogHandler := api.NewCatalogHandler(orchestrator.GetPromoAgent())

	// Create Integration Services
	excelExporter := integrations.NewExcelExporter(db)
	whatsappBcast := integrations.NewWhatsAppBroadcaster(db, cfg.KolosalBaseURL, cfg.KolosalAPIKey)
	socialMediaGen := integrations.NewSocialMediaGenerator(cfg.GeminiAPIKey)

	// Create Integrations Handler
	integrationsHandler := handlers.NewIntegrationsHandler(excelExporter, whatsappBcast, socialMediaGen)

	// Create Message Router (for registration, ambiguity, categorization)
	// Note: This requires importing handlers package
	// messageRouter := handlers.NewMessageRouter(db, intentEngine, contextMgr)

	// Create router with integrations handler
	router := api.NewRouter(orchestrator, catalogHandler, db, waSender, integrationsHandler, cfg.GeminiAPIKey)

	// TODO: Set message router on webhook handler
	// webhook.SetMessageRouter(messageRouter)

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
		log.Println("")
		log.Println("📋 Available endpoints:")
		log.Println("   POST /internal/webhook/whatsapp - WA Gateway webhook")
		log.Println("   POST /api/payments/webhook - Midtrans payment webhook")
		log.Println("   POST /api/intent/test - Test intent extraction")
		log.Println("   POST /api/analytics/forecast - Sales forecasting")
		log.Println("   POST /api/analytics/price-optimization - Price optimization")
		log.Println("   POST /api/analytics/inventory-optimization - Inventory optimization")
		log.Println("   POST /api/integrations/export - Export to Excel")
		log.Println("   POST /api/integrations/broadcast - WhatsApp broadcast")
		log.Println("   GET  /api/integrations/broadcast/templates - Broadcast templates")
		log.Println("   POST /api/integrations/social-content - Generate social media content")
		log.Println("   POST /api/integrations/social-content/bulk - Generate bulk content")
		log.Println("   GET  /health - Health check")
		log.Println("")
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
