package api

import (
	"encoding/json"
	"io"
	"log"
	"net/http"

	"github.com/pasarsuara/backend/internal/ai"
)

// ReceiptHandler handles receipt image analysis via web upload
type ReceiptHandler struct {
	gemini *ai.GeminiClient
}

func NewReceiptHandler(geminiKey string) *ReceiptHandler {
	return &ReceiptHandler{
		gemini: ai.NewGeminiClient(geminiKey),
	}
}

// ReceiptAnalyzeResponse is the API response for receipt analysis
type ReceiptAnalyzeResponse struct {
	Success bool             `json:"success"`
	Items   []ai.ReceiptItem `json:"items"`
	Summary string           `json:"summary"`
	Error   string           `json:"error,omitempty"`
}

// HandleAnalyze accepts a multipart image upload and returns extracted items
func (h *ReceiptHandler) HandleAnalyze(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		json.NewEncoder(w).Encode(ReceiptAnalyzeResponse{
			Success: false,
			Error:   "File terlalu besar atau format tidak valid (max 10MB)",
		})
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		json.NewEncoder(w).Encode(ReceiptAnalyzeResponse{
			Success: false,
			Error:   "File gambar tidak ditemukan. Kirim file dengan field 'image'",
		})
		return
	}
	defer file.Close()

	// Read image data
	imageData, err := io.ReadAll(file)
	if err != nil {
		json.NewEncoder(w).Encode(ReceiptAnalyzeResponse{
			Success: false,
			Error:   "Gagal membaca file gambar",
		})
		return
	}

	log.Printf("📷 Receipt upload: %s (%d bytes)", header.Filename, len(imageData))

	// Detect mime type
	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "image/jpeg"
	}

	caption := r.FormValue("caption")

	// Analyze with Gemini Vision
	result, err := h.gemini.AnalyzeReceiptImage(r.Context(), imageData, mimeType, caption)
	if err != nil {
		log.Printf("❌ Receipt analysis failed: %v", err)
		json.NewEncoder(w).Encode(ReceiptAnalyzeResponse{
			Success: false,
			Error:   "Gagal menganalisis foto. Pastikan foto jelas dan coba lagi.",
		})
		return
	}

	if len(result.Items) == 0 {
		json.NewEncoder(w).Encode(ReceiptAnalyzeResponse{
			Success: false,
			Error:   "Tidak ada item yang terdeteksi dari foto. Pastikan foto menampilkan nota/struk dengan jelas.",
		})
		return
	}

	log.Printf("✅ Receipt analyzed: %d items found", len(result.Items))

	json.NewEncoder(w).Encode(ReceiptAnalyzeResponse{
		Success: true,
		Items:   result.Items,
		Summary: result.Summary,
	})
}
