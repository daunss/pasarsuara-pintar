package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/pasarsuara/backend/internal/agents"
)

func NewRouter(orchestrator *agents.AgentOrchestrator, catalogHandler *CatalogHandler) http.Handler {
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	// Internal webhooks (from WA Gateway)
	webhook := NewWhatsAppWebhook(orchestrator)
	r.Post("/internal/webhook/whatsapp", webhook.Handle)

	// Public API routes
	r.Route("/api", func(r chi.Router) {
		// Dashboard endpoints
		r.Get("/dashboard/stats", handleDashboardStats)

		// Inventory endpoints
		r.Get("/inventory", handleGetInventory)

		// Negotiations endpoints
		r.Get("/negotiations", handleGetNegotiations)

		// Catalog & Promo generation
		r.Get("/catalog", catalogHandler.HandleGenerateCatalog)
		r.Post("/catalog/generate", catalogHandler.HandleGenerateCatalog)
		r.Post("/promo/generate", catalogHandler.HandleGeneratePromo)
		r.Post("/promo/bundle", catalogHandler.HandleGenerateBundle)

		// Intent/Agent test endpoint (for debugging)
		r.Post("/intent/test", webhook.Handle)
	})

	return r
}

// Placeholder handlers - will connect to real data
func handleDashboardStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{
		"today_sales": 300000,
		"today_purchases": 295000,
		"today_expenses": 44000,
		"gross_profit": -39000,
		"transaction_count": 4
	}`))
}

func handleGetInventory(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{
		"items": [
			{"product_name": "Beras Premium", "stock_qty": 25, "unit": "kg"},
			{"product_name": "Minyak Goreng", "stock_qty": 10, "unit": "liter"},
			{"product_name": "Telur Ayam", "stock_qty": 50, "unit": "butir"}
		]
	}`))
}

func handleGetNegotiations(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{
		"negotiations": [
			{"product": "Beras Premium", "status": "SUCCESS", "final_price": 11800}
		]
	}`))
}
