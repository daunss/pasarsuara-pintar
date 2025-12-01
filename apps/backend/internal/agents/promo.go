package agents

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/pasarsuara/backend/internal/database"
)

// PromoAgent generates promotional content using AI
type PromoAgent struct {
	db             *database.SupabaseClient
	kolosalKey     string
	kolosalBaseURL string
	geminiKey      string
	httpClient     *http.Client
}

// PromoResult represents generated promotional content
type PromoResult struct {
	ProductName     string `json:"product_name"`
	ShortCaption    string `json:"short_caption"`    // For WhatsApp status
	LongDescription string `json:"long_description"` // For marketplace
	Hashtags        string `json:"hashtags"`
	CallToAction    string `json:"call_to_action"`
	PriceDisplay    string `json:"price_display"`
	ImagePrompt     string `json:"image_prompt,omitempty"` // For image generation
}

// CatalogItem represents a product in the catalog
type CatalogItem struct {
	ProductName string  `json:"product_name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Unit        string  `json:"unit"`
	Stock       float64 `json:"stock"`
	PromoText   string  `json:"promo_text,omitempty"`
}

func NewPromoAgent(db *database.SupabaseClient, kolosalKey, kolosalBaseURL, geminiKey string) *PromoAgent {
	return &PromoAgent{
		db:             db,
		kolosalKey:     kolosalKey,
		kolosalBaseURL: kolosalBaseURL,
		geminiKey:      geminiKey,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// GeneratePromo creates promotional content for a product
func (p *PromoAgent) GeneratePromo(ctx context.Context, product string, price float64, description string) (*PromoResult, error) {
	log.Printf("🎨 Promo Agent: Generating promo for %s", product)

	if p.kolosalKey == "" {
		// Return demo promo if no API key
		return p.generateDemoPromo(product, price), nil
	}

	prompt := fmt.Sprintf(`Buatkan konten promosi untuk produk UMKM Indonesia.

Produk: %s
Harga: Rp %.0f
Deskripsi: %s

Buatkan dalam format JSON:
{
  "short_caption": "Caption singkat untuk status WhatsApp (max 100 karakter, include emoji)",
  "long_description": "Deskripsi lengkap untuk marketplace (2-3 paragraf, persuasif)",
  "hashtags": "5-7 hashtag relevan",
  "call_to_action": "Ajakan untuk membeli",
  "price_display": "Format harga yang menarik",
  "image_prompt": "Prompt untuk generate gambar produk (dalam bahasa Inggris)"
}

Gunakan bahasa Indonesia yang natural dan menarik untuk UMKM.`, product, price, description)

	result, err := p.callKolosal(ctx, prompt)
	if err != nil {
		log.Printf("⚠️ Kolosal API failed, using demo: %v", err)
		return p.generateDemoPromo(product, price), nil
	}

	var promo PromoResult
	if err := json.Unmarshal([]byte(result), &promo); err != nil {
		log.Printf("⚠️ Failed to parse promo JSON: %v", err)
		return p.generateDemoPromo(product, price), nil
	}

	promo.ProductName = product
	return &promo, nil
}

// GenerateCatalog creates a catalog from inventory
func (p *PromoAgent) GenerateCatalog(ctx context.Context, userID string) ([]CatalogItem, error) {
	log.Printf("📚 Promo Agent: Generating catalog for user %s", userID)

	// Get inventory from database or use demo
	var items []CatalogItem

	if p.db != nil {
		// TODO: Fetch real inventory
	}

	// Demo catalog
	if len(items) == 0 {
		items = []CatalogItem{
			{
				ProductName: "Nasi Rames Komplit",
				Description: "Nasi putih dengan lauk lengkap: ayam goreng, tempe, tahu, sambal, dan lalapan segar",
				Price:       15000,
				Unit:        "porsi",
				Stock:       50,
			},
			{
				ProductName: "Nasi Goreng Spesial",
				Description: "Nasi goreng dengan telur, ayam suwir, dan kerupuk. Pedas sesuai selera!",
				Price:       18000,
				Unit:        "porsi",
				Stock:       50,
			},
			{
				ProductName: "Es Teh Manis",
				Description: "Teh manis dingin segar, pas untuk cuaca panas",
				Price:       5000,
				Unit:        "gelas",
				Stock:       100,
			},
		}
	}

	// Generate promo text for each item
	for i := range items {
		promo, _ := p.GeneratePromo(ctx, items[i].ProductName, items[i].Price, items[i].Description)
		if promo != nil {
			items[i].PromoText = promo.ShortCaption
		}
	}

	return items, nil
}

// GenerateBundlePromo creates a bundle/combo promotion
func (p *PromoAgent) GenerateBundlePromo(ctx context.Context, products []string, bundlePrice float64) (*PromoResult, error) {
	log.Printf("🎁 Promo Agent: Generating bundle promo")

	productList := ""
	for _, prod := range products {
		productList += "- " + prod + "\n"
	}

	if p.kolosalKey == "" {
		return &PromoResult{
			ProductName:     "Paket Hemat",
			ShortCaption:    fmt.Sprintf("🎁 PAKET HEMAT! Cuma Rp %.0f aja! Buruan sebelum kehabisan! 🔥", bundlePrice),
			LongDescription: fmt.Sprintf("Paket hemat spesial:\n%s\nHarga normal jauh lebih mahal, sekarang cuma Rp %.0f!\n\nPromo terbatas, jangan sampai kehabisan!", productList, bundlePrice),
			Hashtags:        "#PaketHemat #Promo #UMKM #MakanEnak #Hemat",
			CallToAction:    "Chat sekarang untuk pesan!",
			PriceDisplay:    fmt.Sprintf("Rp %.0f", bundlePrice),
		}, nil
	}

	prompt := fmt.Sprintf(`Buatkan promosi paket bundling untuk UMKM:

Produk dalam paket:
%s

Harga paket: Rp %.0f

Buatkan dalam format JSON dengan field: short_caption, long_description, hashtags, call_to_action, price_display.
Buat menarik dan persuasif untuk pembeli Indonesia.`, productList, bundlePrice)

	result, err := p.callKolosal(ctx, prompt)
	if err != nil {
		return nil, err
	}

	var promo PromoResult
	if err := json.Unmarshal([]byte(result), &promo); err != nil {
		return nil, err
	}

	promo.ProductName = "Paket Hemat"
	return &promo, nil
}

func (p *PromoAgent) callKolosal(ctx context.Context, prompt string) (string, error) {
	reqBody := map[string]any{
		"model": "kolosal-1-full",
		"messages": []map[string]string{
			{"role": "system", "content": "Kamu adalah copywriter profesional untuk UMKM Indonesia. Selalu respond dengan JSON valid."},
			{"role": "user", "content": prompt},
		},
	}

	jsonData, _ := json.Marshal(reqBody)
	url := fmt.Sprintf("%s/chat/completions", p.kolosalBaseURL)

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", p.kolosalKey))

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	if len(result.Choices) == 0 {
		return "", fmt.Errorf("no response from Kolosal")
	}

	return result.Choices[0].Message.Content, nil
}

func (p *PromoAgent) generateDemoPromo(product string, price float64) *PromoResult {
	return &PromoResult{
		ProductName:     product,
		ShortCaption:    fmt.Sprintf("🔥 %s ENAK BANGET! Cuma Rp %.0f! Yuk order sekarang! 😋", product, price),
		LongDescription: fmt.Sprintf("✨ %s ✨\n\nDibuat dengan bahan pilihan dan resep rahasia turun temurun. Dijamin enak dan bikin nagih!\n\n💰 Harga: Rp %.0f\n📍 Tersedia setiap hari\n⏰ Order sekarang!\n\nChat langsung untuk pesan. Bisa COD atau ambil di tempat!", product, price),
		Hashtags:        "#KulinerLokal #UMKM #MakanEnak #Promo #JajananEnak #FoodLovers",
		CallToAction:    "💬 Chat sekarang untuk pesan!",
		PriceDisplay:    fmt.Sprintf("Rp %.0f", price),
		ImagePrompt:     fmt.Sprintf("Professional food photography of %s, Indonesian cuisine, appetizing, warm lighting, top view, high quality", product),
	}
}

// FormatForWhatsApp formats promo for WhatsApp sharing
func (p *PromoAgent) FormatForWhatsApp(promo *PromoResult) string {
	return fmt.Sprintf(`%s

%s

%s

%s

%s`, promo.ShortCaption, promo.LongDescription, promo.PriceDisplay, promo.CallToAction, promo.Hashtags)
}

// FormatForMarketplace formats promo for marketplace listing
func (p *PromoAgent) FormatForMarketplace(promo *PromoResult) string {
	return fmt.Sprintf(`%s

%s

Harga: %s

%s`, promo.ProductName, promo.LongDescription, promo.PriceDisplay, promo.Hashtags)
}
