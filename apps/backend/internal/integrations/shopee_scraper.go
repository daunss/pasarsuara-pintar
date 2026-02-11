package integrations

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
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

// NewShopeeScraper creates a new Shopee scraper
func NewShopeeScraper() *ShopeeScraper {
	return &ShopeeScraper{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// shopeeSearchShopResponse is the API response for shop search
type shopeeSearchShopResponse struct {
	Shops []struct {
		ShopID       int64   `json:"shopid"`
		ShopName     string  `json:"shop_name"`
		ShopLocation string  `json:"shop_location"`
		ItemCount    int     `json:"item_count"`
		Follower     int     `json:"follower_count"`
		RatingStar   float64 `json:"rating_star"`
		Portrait     string  `json:"account"`
	} `json:"shops"`
}

// shopeeItemsResponse is the API response for product listing
type shopeeItemsResponse struct {
	Items []struct {
		ItemBasic struct {
			ItemID     int64   `json:"itemid"`
			ShopID     int64   `json:"shopid"`
			Name       string  `json:"name"`
			Image      string  `json:"image"`
			Price      int64   `json:"price"`
			PriceMin   int64   `json:"price_min"`
			PriceMax   int64   `json:"price_max"`
			Stock      int     `json:"stock"`
			Sold       int     `json:"historical_sold"`
			CatID      int64   `json:"catid"`
			RatingStar float64 `json:"item_rating"`
		} `json:"item_basic"`
	} `json:"items"`
	Total  int  `json:"total"`
	NoMore bool `json:"no_more"`
}

// shopeeV4SearchResponse is the v4 API response
type shopeeV4SearchResponse struct {
	Error int `json:"error"`
	Items []struct {
		ItemBasic struct {
			ItemID     int64  `json:"itemid"`
			ShopID     int64  `json:"shopid"`
			Name       string `json:"name"`
			Image      string `json:"image"`
			Price      int64  `json:"price"`
			PriceMin   int64  `json:"price_min"`
			PriceMax   int64  `json:"price_max"`
			Stock      int    `json:"stock"`
			Sold       int    `json:"historical_sold"`
			CatID      int64  `json:"catid"`
			ItemRating struct {
				RatingStar float64 `json:"rating_star"`
			} `json:"item_rating"`
		} `json:"item_basic"`
	} `json:"items"`
	TotalCount int  `json:"total_count"`
	NoMore     bool `json:"nomore"`
}

// SearchShop searches for a shop by name and returns basic info
func (s *ShopeeScraper) SearchShop(ctx context.Context, shopName string) (*ShopeeShopInfo, error) {
	log.Printf("🔍 Searching Shopee for shop: %s", shopName)

	// Clean up the shop name (handle URL or plain name)
	cleanName := extractShopName(shopName)

	// Try to get shop info via the shop page API
	shopInfo, err := s.getShopByUsername(ctx, cleanName)
	if err != nil {
		log.Printf("⚠️ Direct shop lookup failed: %v, trying search...", err)
		// Fallback to search API
		return s.searchShopByKeyword(ctx, cleanName)
	}
	return shopInfo, nil
}

// extractShopName cleans up shop input (URL or name)
func extractShopName(input string) string {
	input = strings.TrimSpace(input)

	// Handle full Shopee URLs like https://shopee.co.id/shop_name
	if strings.Contains(input, "shopee.co.id/") {
		parts := strings.Split(input, "shopee.co.id/")
		if len(parts) > 1 {
			name := strings.Split(parts[1], "?")[0]
			name = strings.Split(name, "/")[0]
			return strings.TrimSpace(name)
		}
	}

	// Handle @username format
	input = strings.TrimPrefix(input, "@")

	return input
}

// getShopByUsername tries to get shop info directly
func (s *ShopeeScraper) getShopByUsername(ctx context.Context, username string) (*ShopeeShopInfo, error) {
	apiURL := fmt.Sprintf("https://shopee.co.id/api/v4/shop/get_shop_detail?username=%s", url.QueryEscape(username))

	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	s.setHeaders(req)

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
		return nil, fmt.Errorf("shop not found")
	}

	return &ShopeeShopInfo{
		ShopID:       result.Data.ShopID,
		ShopName:     result.Data.Name,
		ShopLocation: result.Data.ShopLocation,
		ItemCount:    result.Data.ItemCount,
		FollowCount:  result.Data.FollowerCount,
		RatingStar:   result.Data.RatingStar,
		Portrait:     result.Data.Account.Portrait,
	}, nil
}

// searchShopByKeyword searches shop via keyword search
func (s *ShopeeScraper) searchShopByKeyword(ctx context.Context, keyword string) (*ShopeeShopInfo, error) {
	apiURL := fmt.Sprintf("https://shopee.co.id/api/v4/search/search_shop?keyword=%s&limit=1&page=0", url.QueryEscape(keyword))

	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	s.setHeaders(req)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("search request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body failed: %w", err)
	}

	var result struct {
		Shops []struct {
			ShopID       int64   `json:"shopid"`
			ShopName     string  `json:"shop_name"`
			ShopLocation string  `json:"shop_location"`
			ItemCount    int     `json:"item_count"`
			Follower     int     `json:"follower_count"`
			RatingStar   float64 `json:"rating_star"`
		} `json:"shops"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parse search result failed: %w", err)
	}

	if len(result.Shops) == 0 {
		return nil, fmt.Errorf("no shops found for: %s", keyword)
	}

	shop := result.Shops[0]
	return &ShopeeShopInfo{
		ShopID:       shop.ShopID,
		ShopName:     shop.ShopName,
		ShopLocation: shop.ShopLocation,
		ItemCount:    shop.ItemCount,
		FollowCount:  shop.Follower,
		RatingStar:   shop.RatingStar,
	}, nil
}

// GetShopProducts fetches all products from a shop
func (s *ShopeeScraper) GetShopProducts(ctx context.Context, shopID int64, limit int) ([]ShopeeProduct, error) {
	log.Printf("📦 Fetching products for shop ID: %d (limit: %d)", shopID, limit)

	var allProducts []ShopeeProduct
	offset := 0
	pageSize := 30
	if limit > 0 && limit < pageSize {
		pageSize = limit
	}

	for {
		if limit > 0 && len(allProducts) >= limit {
			break
		}

		products, noMore, err := s.fetchProductPage(ctx, shopID, offset, pageSize)
		if err != nil {
			if len(allProducts) > 0 {
				log.Printf("⚠️ Error fetching page at offset %d: %v, returning %d products", offset, err, len(allProducts))
				break
			}
			return nil, fmt.Errorf("failed to fetch products: %w", err)
		}

		allProducts = append(allProducts, products...)
		log.Printf("📦 Fetched %d products (total: %d)", len(products), len(allProducts))

		if noMore || len(products) == 0 {
			break
		}

		offset += pageSize

		// Rate limit: don't hammer Shopee
		time.Sleep(500 * time.Millisecond)
	}

	if limit > 0 && len(allProducts) > limit {
		allProducts = allProducts[:limit]
	}

	log.Printf("✅ Total products fetched: %d", len(allProducts))
	return allProducts, nil
}

// fetchProductPage fetches a single page of products
func (s *ShopeeScraper) fetchProductPage(ctx context.Context, shopID int64, offset, limit int) ([]ShopeeProduct, bool, error) {
	apiURL := fmt.Sprintf(
		"https://shopee.co.id/api/v4/search/search_items?by=pop&limit=%d&match_id=%d&newest=%d&order=desc&page_type=shop&scenario=PAGE_OTHERS&version=2",
		limit, shopID, offset,
	)

	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return nil, false, err
	}
	s.setHeaders(req)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, false, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, false, fmt.Errorf("read body failed: %w", err)
	}

	var result shopeeV4SearchResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, false, fmt.Errorf("parse failed: %w", err)
	}

	if result.Error != 0 {
		return nil, false, fmt.Errorf("shopee API error code: %d", result.Error)
	}

	var products []ShopeeProduct
	for _, item := range result.Items {
		ib := item.ItemBasic
		products = append(products, ShopeeProduct{
			ItemID:     ib.ItemID,
			ShopID:     ib.ShopID,
			Name:       ib.Name,
			Image:      fmt.Sprintf("https://down-id.img.susercontent.com/file/%s", ib.Image),
			Price:      float64(ib.Price) / 100000,
			PriceMin:   float64(ib.PriceMin) / 100000,
			PriceMax:   float64(ib.PriceMax) / 100000,
			Stock:      ib.Stock,
			Sold:       ib.Sold,
			RatingStar: ib.ItemRating.RatingStar,
		})
	}

	return products, result.NoMore, nil
}

// setHeaders sets required headers to mimic a browser request
func (s *ShopeeScraper) setHeaders(req *http.Request) {
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Language", "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7")
	req.Header.Set("Referer", "https://shopee.co.id/")
	req.Header.Set("X-Shopee-Language", "id")
	req.Header.Set("X-Requested-With", "XMLHttpRequest")
	req.Header.Set("Sec-Fetch-Site", "same-origin")
	req.Header.Set("Sec-Fetch-Mode", "cors")
	req.Header.Set("Sec-Fetch-Dest", "empty")
	req.Header.Set("If-None-Match-", "*")
}
