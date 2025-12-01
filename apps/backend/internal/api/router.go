package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/pasarsuara/backend/internal/ai"
)

func NewRouter(intentEngine *ai.IntentEngine) http.Handler {
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
	webhook := NewWhatsAppWebhook(intentEngine)
	r.Post("/internal/webhook/whatsapp", webhook.Handle)

	// Public API routes
	r.Route("/api", func(r chi.Router) {
		// Dashboard endpoints
		r.Get("/dashboard/stats", handleDashboardStats)

		// Inventory endpoints
		r.Get("/inventory", handleGetInventory)

		// Negotiations endpoints
		r.Get("/negotiations", handleGetNegotiations)

		// Catalog generation
		r.Post("/catalog/generate", handleGenerateCatalog)

		// Intent test endpoint (for debugging)
		r.Post("/intent/test", func(w http.ResponseWriter, req *http.Request) {
			webhook.Handle(w, req)
		})
	})

	return r
}

// Placeholder handlers - will be implemented in later phases
func handleDashboardStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"message": "Dashboard stats - coming soon"}`))
}

func handleGetInventory(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"message": "Inventory list - coming soon"}`))
}

func handleGetNegotiations(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"message": "Negotiations list - coming soon"}`))
}

func handleGenerateCatalog(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"message": "Catalog generation - coming soon"}`))
}
