package integrations

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// ShopeeProduct represents a scraped product from Shopee
type ShopeeProduct struct {
	ItemID      int64   `json:"item_id"`
	ShopID      int64   `json:"shop_id"`
	Name        string  `json:"name"`
	Image       string  `json:"image"`
	Price       float64 `json:"price"`
	PriceMin    float64 `json:"price_min"`
	PriceMax    float64 `json:"price_max"`
	Stock       int     `json:"stock"`
	Sold        int     `json:"sold"`
	Category    string  `json:"category"`
	RatingStar  float64 `json:"rating_star"`
	Description string  `json:"description,omitempty"`
}

// ShopeeShopInfo represents basic shop information
type ShopeeShopInfo struct {
	ShopID       int64   `json:"shop_id"`
	ShopName     string  `json:"shop_name"`
	Username     string  `json:"username,omitempty"`
	ShopLocation string  `json:"shop_location"`
	ItemCount    int     `json:"item_count"`
	FollowCount  int     `json:"follow_count"`
	RatingStar   float64 `json:"rating_star"`
	Portrait     string  `json:"portrait"`
}

// ShopeeScraper handles scraping products from Shopee
type ShopeeScraper struct {
	client *http.Client
}

// NewShopeeScraper creates a new Shopee scraper with cookie jar
func NewShopeeScraper() *ShopeeScraper {
	jar, _ := cookiejar.New(nil)
	return &ShopeeScraper{
		client: &http.Client{
			Timeout: 30 * time.Second,
			Jar:     jar,
		},
	}
}

// SearchShop searches for a shop by name and returns basic info
func (s *ShopeeScraper) SearchShop(ctx context.Context, shopName string) (*ShopeeShopInfo, error) {
	log.Printf("🔍 Searching Shopee for shop: %s", shopName)

	cleanName := extractShopName(shopName)

	// Try to get shop info via the shop detail API (most reliable)
	shopInfo, err := s.getShopByUsername(ctx, cleanName)
	if err != nil {
		log.Printf("⚠️ Direct shop lookup failed: %v", err)
		return nil, fmt.Errorf("toko '%s' tidak ditemukan. Pastikan username toko benar (cek di URL shopee.co.id/NAMA_TOKO)", cleanName)
	}
	return shopInfo, nil
}

// extractShopName cleans up shop input (URL or name)
func extractShopName(input string) string {
	input = strings.TrimSpace(input)

	// Handle full Shopee URLs
	if strings.Contains(input, "shopee.co.id/") {
		parts := strings.Split(input, "shopee.co.id/")
		if len(parts) > 1 {
			name := strings.Split(parts[1], "?")[0]
			name = strings.Split(name, "/")[0]
			name = strings.Split(name, "#")[0]
			return strings.TrimSpace(name)
		}
	}

	// Handle @username format
	input = strings.TrimPrefix(input, "@")

	return input
}

// getShopByUsername tries to get shop info via API
func (s *ShopeeScraper) getShopByUsername(ctx context.Context, username string) (*ShopeeShopInfo, error) {
	apiURL := fmt.Sprintf("https://shopee.co.id/api/v4/shop/get_shop_detail?username=%s", url.QueryEscape(username))

	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	s.setAPIHeaders(req)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body failed: %w", err)
	}

	log.Printf("📡 Shop detail API (status: %d, size: %d)", resp.StatusCode, len(body))

	var result struct {
		Data struct {
			ShopID  int64  `json:"shopid"`
			Name    string `json:"name"`
			Account struct {
				Username string `json:"username"`
				Portrait string `json:"portrait"`
			} `json:"account"`
			ShopLocation  string  `json:"shop_location"`
			ItemCount     int     `json:"item_count"`
			FollowerCount int     `json:"follower_count"`
			RatingStar    float64 `json:"rating_star"`
		} `json:"data"`
		Error    int    `json:"error"`
		ErrorMsg string `json:"error_msg"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parse failed: %w", err)
	}

	if result.Error != 0 || result.Data.ShopID == 0 {
		return nil, fmt.Errorf("shop not found (error: %d, msg: %s)", result.Error, result.ErrorMsg)
	}

	return &ShopeeShopInfo{
		ShopID:       result.Data.ShopID,
		ShopName:     result.Data.Name,
		Username:     result.Data.Account.Username,
		ShopLocation: result.Data.ShopLocation,
		ItemCount:    result.Data.ItemCount,
		FollowCount:  result.Data.FollowerCount,
		RatingStar:   result.Data.RatingStar,
		Portrait:     result.Data.Account.Portrait,
	}, nil
}

// GetShopProducts fetches products from a shop using SSR scraping
func (s *ShopeeScraper) GetShopProducts(ctx context.Context, shopID int64, limit int) ([]ShopeeProduct, error) {
	log.Printf("📦 Fetching products for shop ID: %d (limit: %d)", shopID, limit)

	// Get shop username first
	shopInfo, err := s.getShopByShopID(ctx, shopID)
	if err != nil {
		return nil, fmt.Errorf("cannot get shop info: %w", err)
	}

	username := shopInfo.Username
	if username == "" {
		return nil, fmt.Errorf("shop username not available")
	}

	var allProducts []ShopeeProduct
	maxPages := 5 // max 150 products (30 per page)
	if limit > 0 {
		maxPages = (limit / 30) + 1
		if maxPages > 10 {
			maxPages = 10
		}
	}

	for page := 0; page < maxPages; page++ {
		if limit > 0 && len(allProducts) >= limit {
			break
		}

		products, err := s.scrapeShopPage(ctx, username, shopID, page)
		if err != nil {
			log.Printf("⚠️ Error scraping page %d: %v", page, err)
			if len(allProducts) > 0 {
				break
			}
			return nil, err
		}

		if len(products) == 0 {
			break
		}

		allProducts = append(allProducts, products...)
		log.Printf("📦 Page %d: %d products (total: %d)", page, len(products), len(allProducts))

		if page < maxPages-1 {
			time.Sleep(500 * time.Millisecond)
		}
	}

	if limit > 0 && len(allProducts) > limit {
		allProducts = allProducts[:limit]
	}

	log.Printf("✅ Total products fetched: %d", len(allProducts))
	return allProducts, nil
}

// scrapeShopPage scrapes a single page of products from the shop SSR page
func (s *ShopeeScraper) scrapeShopPage(ctx context.Context, username string, shopID int64, page int) ([]ShopeeProduct, error) {
	shopURL := fmt.Sprintf("https://shopee.co.id/%s?page=%d&sortBy=pop", url.PathEscape(username), page)

	req, err := http.NewRequestWithContext(ctx, "GET", shopURL, nil)
	if err != nil {
		return nil, err
	}
	// Use Googlebot UA to get SSR content with product data
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")
	req.Header.Set("Accept", "text/html,application/xhtml+xml")
	req.Header.Set("Accept-Language", "id-ID,id;q=0.9")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body failed: %w", err)
	}

	pageContent := string(body)
	log.Printf("📡 Shop page %d fetched (status: %d, size: %d)", page, resp.StatusCode, len(body))

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("page returned status %d", resp.StatusCode)
	}

	return s.parseProductCards(pageContent, shopID), nil
}

// Regex patterns for parsing product cards
var (
	itemIDRe  = regexp.MustCompile(`i\.(\d+)\.(\d+)`)
	imgSrcRe  = regexp.MustCompile(`<img[^>]*src="(https://down-id\.img\.susercontent\.com/file/[^"]+)"`)
	altTextRe = regexp.MustCompile(`alt="([^"]{5,})"`)
	priceRe   = regexp.MustCompile(`text-base/5 font-medium">([^<]+)<`)
	soldRe    = regexp.MustCompile(`>(\d[\d.,]*[kKrRbB]*)\s*[Tt]erjual<`)
	discRe    = regexp.MustCompile(`aria-label="-(\d+)%"`)
)

// parseProductCards extracts products from SSR HTML by splitting on card class
func (s *ShopeeScraper) parseProductCards(html string, shopID int64) []ShopeeProduct {
	cards := strings.Split(html, "shop-search-result-view__item")
	if len(cards) <= 1 {
		// Fallback: try alternative card class
		cards = strings.Split(html, "shopee-search-item-result__item")
	}

	var products []ShopeeProduct
	seen := make(map[int64]bool)

	for i, card := range cards {
		if i == 0 {
			continue // Skip header part
		}

		// Extract item ID
		itemMatch := itemIDRe.FindStringSubmatch(card)
		if len(itemMatch) < 3 {
			continue
		}
		itemID, err := strconv.ParseInt(itemMatch[2], 10, 64)
		if err != nil || seen[itemID] {
			continue
		}
		seen[itemID] = true

		cardShopID, _ := strconv.ParseInt(itemMatch[1], 10, 64)
		if cardShopID != shopID && shopID > 0 {
			cardShopID = shopID
		}

		// Extract product name from alt text
		name := ""
		altMatch := altTextRe.FindStringSubmatch(card)
		if len(altMatch) > 1 {
			name = altMatch[1]
			// Clean up HTML entities
			name = strings.ReplaceAll(name, "&amp;", "&")
			name = strings.ReplaceAll(name, "&#x27;", "'")
			name = strings.ReplaceAll(name, "&quot;", "\"")
		}
		if name == "" || name == "custom-overlay" || name == "flag-label" {
			// Try next alt text
			allAlts := altTextRe.FindAllStringSubmatch(card, -1)
			for _, a := range allAlts {
				if len(a) > 1 && a[1] != "custom-overlay" && a[1] != "flag-label" && len(a[1]) > 10 {
					name = a[1]
					name = strings.ReplaceAll(name, "&amp;", "&")
					break
				}
			}
		}
		if name == "" {
			continue // Skip if no name found
		}

		// Extract image URL
		image := ""
		imgMatch := imgSrcRe.FindStringSubmatch(card)
		if len(imgMatch) > 1 {
			image = imgMatch[1]
			// Remove _tn suffix for full image
			image = strings.Replace(image, "_tn.webp", ".webp", 1)
			image = strings.Replace(image, "_tn.jpg", ".jpg", 1)
		}

		// Extract price
		var price float64
		priceMatch := priceRe.FindStringSubmatch(card)
		if len(priceMatch) > 1 {
			priceStr := strings.ReplaceAll(priceMatch[1], ".", "")
			priceStr = strings.ReplaceAll(priceStr, ",", "")
			if p, err := strconv.ParseFloat(priceStr, 64); err == nil {
				price = p
			}
		}

		// Extract sold count
		var sold int
		soldMatch := soldRe.FindStringSubmatch(card)
		if len(soldMatch) > 1 {
			soldStr := soldMatch[1]
			soldStr = strings.ReplaceAll(soldStr, ".", "")
			soldStr = strings.ReplaceAll(soldStr, ",", "")
			// Handle "rb" (ribu) suffix
			multiplier := 1
			if strings.HasSuffix(strings.ToLower(soldStr), "rb") {
				soldStr = soldStr[:len(soldStr)-2]
				multiplier = 1000
			} else if strings.HasSuffix(strings.ToLower(soldStr), "k") {
				soldStr = soldStr[:len(soldStr)-1]
				multiplier = 1000
			}
			if s, err := strconv.Atoi(soldStr); err == nil {
				sold = s * multiplier
			}
		}

		products = append(products, ShopeeProduct{
			ItemID: itemID,
			ShopID: cardShopID,
			Name:   name,
			Image:  image,
			Price:  price,
			Stock:  999, // SSR doesn't provide exact stock
			Sold:   sold,
		})
	}

	return products
}

// getShopByShopID gets shop info by numeric shop ID
func (s *ShopeeScraper) getShopByShopID(ctx context.Context, shopID int64) (*ShopeeShopInfo, error) {
	apiURL := fmt.Sprintf("https://shopee.co.id/api/v4/shop/get_shop_detail?shopid=%d", shopID)

	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	s.setAPIHeaders(req)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body failed: %w", err)
	}

	var result struct {
		Data struct {
			ShopID  int64  `json:"shopid"`
			Name    string `json:"name"`
			Account struct {
				Username string `json:"username"`
				Portrait string `json:"portrait"`
			} `json:"account"`
			ShopLocation  string  `json:"shop_location"`
			ItemCount     int     `json:"item_count"`
			FollowerCount int     `json:"follower_count"`
			RatingStar    float64 `json:"rating_star"`
		} `json:"data"`
		Error int `json:"error"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parse failed: %w", err)
	}

	if result.Error != 0 || result.Data.ShopID == 0 {
		return nil, fmt.Errorf("shop not found by ID: %d", shopID)
	}

	return &ShopeeShopInfo{
		ShopID:       result.Data.ShopID,
		ShopName:     result.Data.Name,
		Username:     result.Data.Account.Username,
		ShopLocation: result.Data.ShopLocation,
		ItemCount:    result.Data.ItemCount,
		FollowCount:  result.Data.FollowerCount,
		RatingStar:   result.Data.RatingStar,
		Portrait:     result.Data.Account.Portrait,
	}, nil
}

// setAPIHeaders sets JSON API headers
func (s *ShopeeScraper) setAPIHeaders(req *http.Request) {
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Language", "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7")
	req.Header.Set("Referer", "https://shopee.co.id/")
	req.Header.Set("X-Shopee-Language", "id")
}
