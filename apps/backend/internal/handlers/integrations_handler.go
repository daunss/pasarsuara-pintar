package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/pasarsuara/backend/internal/integrations"
)

type IntegrationsHandler struct {
	excelExporter  *integrations.ExcelExporter
	whatsappBcast  *integrations.WhatsAppBroadcaster
	socialMediaGen *integrations.SocialMediaGenerator
}

func NewIntegrationsHandler(
	excelExporter *integrations.ExcelExporter,
	whatsappBcast *integrations.WhatsAppBroadcaster,
	socialMediaGen *integrations.SocialMediaGenerator,
) *IntegrationsHandler {
	return &IntegrationsHandler{
		excelExporter:  excelExporter,
		whatsappBcast:  whatsappBcast,
		socialMediaGen: socialMediaGen,
	}
}

// HandleExportTransactions exports transactions to Excel
func (h *IntegrationsHandler) HandleExportTransactions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req integrations.ExportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("📊 Export request: %+v", req)

	resp, err := h.excelExporter.ExportTransactions(r.Context(), &req)
	if err != nil {
		log.Printf("❌ Export failed: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// HandleWhatsAppBroadcast sends broadcast messages
func (h *IntegrationsHandler) HandleWhatsAppBroadcast(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req integrations.BroadcastRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("📢 Broadcast request: %d recipients", len(req.Recipients))

	resp, err := h.whatsappBcast.SendBroadcast(r.Context(), &req)
	if err != nil {
		log.Printf("❌ Broadcast failed: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// HandleGetBroadcastTemplates returns message templates
func (h *IntegrationsHandler) HandleGetBroadcastTemplates(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	templates := h.whatsappBcast.GetBroadcastTemplates()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"templates": templates,
		"total":     len(templates),
	})
}

// HandleGenerateSocialContent generates social media content
func (h *IntegrationsHandler) HandleGenerateSocialContent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req integrations.ContentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("🎨 Content generation request: %s for %s", req.Platform, req.ProductName)

	resp, err := h.socialMediaGen.GenerateContent(r.Context(), &req)
	if err != nil {
		log.Printf("❌ Content generation failed: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// HandleGenerateBulkSocialContent generates content for all platforms
func (h *IntegrationsHandler) HandleGenerateBulkSocialContent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req integrations.ContentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("🎨 Bulk content generation for: %s", req.ProductName)

	resp, err := h.socialMediaGen.GenerateBulkContent(r.Context(), &req)
	if err != nil {
		log.Printf("❌ Bulk content generation failed: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
