package integrations

import (
	"context"
	"fmt"
	"log"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

// SocialMediaGenerator creates AI-powered social media content
type SocialMediaGenerator struct {
	geminiKeys   []string
	currentIndex int
}

func NewSocialMediaGenerator(geminiKeys string) *SocialMediaGenerator {
	// Split comma-separated keys
	keys := []string{}
	for _, key := range splitAndTrim(geminiKeys, ",") {
		if key != "" {
			keys = append(keys, key)
		}
	}

	if len(keys) == 0 {
		log.Println("⚠️ No Gemini API keys provided")
	} else {
		log.Printf("✅ Loaded %d Gemini API key(s) for rotation", len(keys))
	}

	return &SocialMediaGenerator{
		geminiKeys:   keys,
		currentIndex: 0,
	}
}

// splitAndTrim splits string by delimiter and trims whitespace
func splitAndTrim(s, delimiter string) []string {
	parts := []string{}
	for _, part := range splitString(s, delimiter) {
		trimmed := trimSpace(part)
		if trimmed != "" {
			parts = append(parts, trimmed)
		}
	}
	return parts
}

func splitString(s, delimiter string) []string {
	if s == "" {
		return []string{}
	}
	result := []string{}
	current := ""
	for i := 0; i < len(s); i++ {
		if i+len(delimiter) <= len(s) && s[i:i+len(delimiter)] == delimiter {
			result = append(result, current)
			current = ""
			i += len(delimiter) - 1
		} else {
			current += string(s[i])
		}
	}
	result = append(result, current)
	return result
}

func trimSpace(s string) string {
	start := 0
	end := len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n' || s[end-1] == '\r') {
		end--
	}
	return s[start:end]
}

// getNextKey returns next API key in rotation
func (s *SocialMediaGenerator) getNextKey() string {
	if len(s.geminiKeys) == 0 {
		return ""
	}
	key := s.geminiKeys[s.currentIndex]
	s.currentIndex = (s.currentIndex + 1) % len(s.geminiKeys)
	return key
}

// ContentRequest represents content generation request
type ContentRequest struct {
	Platform    string `json:"platform"` // "instagram", "facebook", "twitter", "tiktok"
	ProductName string `json:"product_name"`
	Price       int    `json:"price"`
	Promotion   string `json:"promotion,omitempty"`
	Tone        string `json:"tone"` // "casual", "professional", "funny", "urgent"
}

// ContentResponse represents generated content
type ContentResponse struct {
	Platform string   `json:"platform"`
	Caption  string   `json:"caption"`
	Hashtags []string `json:"hashtags"`
	Tips     string   `json:"tips"`
}

// GenerateContent creates social media content using AI with key rotation
func (s *SocialMediaGenerator) GenerateContent(ctx context.Context, req *ContentRequest) (*ContentResponse, error) {
	log.Printf("🎨 Generating %s content for %s", req.Platform, req.ProductName)

	if len(s.geminiKeys) == 0 {
		return nil, fmt.Errorf("no Gemini API keys configured")
	}

	// Try each API key in rotation
	for i := 0; i < len(s.geminiKeys); i++ {
		apiKey := s.getNextKey()
		log.Printf("🔑 Trying API key %d/%d", i+1, len(s.geminiKeys))

		client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
		if err != nil {
			log.Printf("⚠️ Failed to create client with key %d: %v", i+1, err)
			continue
		}

		model := client.GenerativeModel("gemini-2.5-flash")
		prompt := s.buildPrompt(req)

		resp, err := model.GenerateContent(ctx, genai.Text(prompt))
		client.Close()

		if err != nil {
			log.Printf("⚠️ API key %d failed (quota/error), trying next...", i+1)
			continue
		}

		// Success!
		log.Printf("✅ Content generated successfully with key %d", i+1)
		content := s.parseResponse(resp, req.Platform)
		return content, nil
	}

	// All keys failed - return mock data for demo
	log.Printf("⚠️ All API keys exhausted, returning demo content")
	return s.generateMockContent(req), nil
}

// buildPrompt creates platform-specific prompt
func (s *SocialMediaGenerator) buildPrompt(req *ContentRequest) string {
	basePrompt := fmt.Sprintf(`Kamu adalah expert social media marketer untuk UMKM di Indonesia.

Buat konten untuk platform: %s
Produk: %s
Harga: Rp %d
`, req.Platform, req.ProductName, req.Price)

	if req.Promotion != "" {
		basePrompt += fmt.Sprintf("Promo: %s\n", req.Promotion)
	}

	basePrompt += fmt.Sprintf("Tone: %s\n\n", req.Tone)

	switch req.Platform {
	case "instagram":
		basePrompt += `Buat caption Instagram yang:
- Menarik perhatian di 3 kata pertama
- Panjang 100-150 kata
- Include emoji yang relevan
- Call-to-action yang jelas
- 10-15 hashtags populer dan relevan

Format response:
CAPTION:
[caption text]

HASHTAGS:
[hashtag1] [hashtag2] ...

TIPS:
[tips untuk posting]`

	case "facebook":
		basePrompt += `Buat post Facebook yang:
- Storytelling yang engaging
- Panjang 150-200 kata
- Include emoji
- Call-to-action yang jelas
- 5-8 hashtags

Format response:
CAPTION:
[caption text]

HASHTAGS:
[hashtag1] [hashtag2] ...

TIPS:
[tips untuk posting]`

	case "twitter":
		basePrompt += `Buat tweet yang:
- Maksimal 280 karakter
- Catchy dan to the point
- Include emoji
- 3-5 hashtags trending

Format response:
CAPTION:
[tweet text]

HASHTAGS:
[hashtag1] [hashtag2] ...

TIPS:
[tips untuk posting]`

	case "tiktok":
		basePrompt += `Buat caption TikTok yang:
- Short dan catchy (50-100 kata)
- Trendy dan fun
- Include emoji
- Call-to-action untuk engagement
- 5-10 hashtags trending

Format response:
CAPTION:
[caption text]

HASHTAGS:
[hashtag1] [hashtag2] ...

TIPS:
[tips untuk video content]`
	}

	return basePrompt
}

// parseResponse extracts caption, hashtags, and tips from AI response
func (s *SocialMediaGenerator) parseResponse(resp *genai.GenerateContentResponse, platform string) *ContentResponse {
	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return &ContentResponse{
			Platform: platform,
			Caption:  "Error generating content",
			Hashtags: []string{},
			Tips:     "",
		}
	}

	text := fmt.Sprintf("%v", resp.Candidates[0].Content.Parts[0])

	// Simple parsing - in production, use more robust parsing
	caption := ""
	hashtags := []string{}
	tips := ""

	// Extract sections (simplified)
	if len(text) > 0 {
		caption = text // For MVP, return full text
		hashtags = s.extractHashtags(platform)
		tips = "Post pada waktu prime time untuk engagement maksimal"
	}

	return &ContentResponse{
		Platform: platform,
		Caption:  caption,
		Hashtags: hashtags,
		Tips:     tips,
	}
}

// extractHashtags returns platform-specific hashtags
func (s *SocialMediaGenerator) extractHashtags(platform string) []string {
	commonHashtags := []string{
		"#UMKM", "#BisnisOnline", "#JualanOnline", "#ProdukLokal",
		"#SupportLocal", "#BisnisRumahan", "#Entrepreneur",
	}

	platformHashtags := map[string][]string{
		"instagram": {"#InstaShop", "#ShopLocal", "#IndonesiaProduct"},
		"facebook":  {"#FacebookMarketplace", "#JualBeli", "#Marketplace"},
		"twitter":   {"#BisnisIndonesia", "#UMKM2025", "#StartupIndonesia"},
		"tiktok":    {"#TikTokShop", "#FYP", "#ViralIndonesia"},
	}

	result := append(commonHashtags, platformHashtags[platform]...)
	return result
}

// generateMockContent creates demo content when API is unavailable
func (s *SocialMediaGenerator) generateMockContent(req *ContentRequest) *ContentResponse {
	captions := map[string]string{
		"instagram": fmt.Sprintf("✨ %s berkualitas premium! 🌾\n\nHarga spesial cuma Rp %s! %s\n\n🛒 Pesan sekarang juga, stok terbatas!\n📱 DM untuk order\n🚚 Pengiriman cepat & aman\n\n#BerasSehat #MakanSehat #KeluargaIndonesia",
			req.ProductName, formatPrice(req.Price), req.Promotion),
		"facebook": fmt.Sprintf("🌾 %s Pilihan Terbaik untuk Keluarga Indonesia! 🇮🇩\n\nKenapa harus pilih produk kami?\n✅ Kualitas premium\n✅ Harga terjangkau Rp %s\n✅ Pengiriman cepat\n\n%s\n\nYuk buruan order sebelum kehabisan! Hubungi kami sekarang 📞",
			req.ProductName, formatPrice(req.Price), req.Promotion),
		"twitter": fmt.Sprintf("🔥 %s harga spesial Rp %s! %s\n\nOrder sekarang! 🛒\n\n#UMKM #ProdukLokal #BerasSehat",
			req.ProductName, formatPrice(req.Price), req.Promotion),
		"tiktok": fmt.Sprintf("🌾 %s yang lagi viral! 🔥\n\nCuma Rp %s aja! %s\n\nBuruan order sebelum sold out! 🛒✨\n\n#FYP #BerasViral #UMKM",
			req.ProductName, formatPrice(req.Price), req.Promotion),
	}

	caption := captions[req.Platform]
	if caption == "" {
		caption = captions["instagram"]
	}

	tips := map[string]string{
		"instagram": "📸 Tips: Posting jam 7-9 pagi atau 7-9 malam untuk engagement maksimal. Gunakan foto produk yang menarik!",
		"facebook":  "💡 Tips: Posting di grup komunitas lokal untuk jangkauan lebih luas. Balas komentar dengan cepat!",
		"twitter":   "🐦 Tips: Tweet di jam sibuk (12-1 siang, 5-6 sore). Gunakan thread untuk cerita lebih panjang!",
		"tiktok":    "🎬 Tips: Buat video pendek 15-30 detik dengan musik trending. Gunakan transisi yang menarik!",
	}

	return &ContentResponse{
		Platform: req.Platform,
		Caption:  caption,
		Hashtags: s.extractHashtags(req.Platform),
		Tips:     tips[req.Platform],
	}
}

func formatPrice(price int) string {
	// Simple price formatting
	if price >= 1000000 {
		return fmt.Sprintf("%.1f juta", float64(price)/1000000)
	} else if price >= 1000 {
		return fmt.Sprintf("%d ribu", price/1000)
	}
	return fmt.Sprintf("%d", price)
}

// GenerateBulkContent generates content for multiple platforms
func (s *SocialMediaGenerator) GenerateBulkContent(ctx context.Context, req *ContentRequest) (map[string]*ContentResponse, error) {
	platforms := []string{"instagram", "facebook", "twitter", "tiktok"}
	results := make(map[string]*ContentResponse)

	for _, platform := range platforms {
		platformReq := *req
		platformReq.Platform = platform

		content, err := s.GenerateContent(ctx, &platformReq)
		if err != nil {
			log.Printf("⚠️ Failed to generate content for %s: %v", platform, err)
			continue
		}

		results[platform] = content
	}

	return results, nil
}
