package database

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// SupabaseClient handles database operations via Supabase REST API
type SupabaseClient struct {
	url        string
	serviceKey string
	httpClient *http.Client
}

func NewSupabaseClient(url, serviceKey string) *SupabaseClient {
	return &SupabaseClient{
		url:        url,
		serviceKey: serviceKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Generic request helper
func (s *SupabaseClient) request(ctx context.Context, method, endpoint string, body any, result any) error {
	var bodyReader io.Reader
	if body != nil {
		jsonData, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("failed to marshal body: %w", err)
		}
		bodyReader = bytes.NewBuffer(jsonData)
	}

	url := fmt.Sprintf("%s/rest/v1/%s", s.url, endpoint)
	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("apikey", s.serviceKey)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.serviceKey))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=representation")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return fmt.Errorf("API error %d: %s", resp.StatusCode, string(respBody))
	}

	if result != nil && len(respBody) > 0 {
		if err := json.Unmarshal(respBody, result); err != nil {
			return fmt.Errorf("failed to parse response: %w", err)
		}
	}

	return nil
}

// Transaction types
type Transaction struct {
	ID           string  `json:"id,omitempty"`
	UserID       string  `json:"user_id"`
	Type         string  `json:"type"` // SALE, PURCHASE, EXPENSE
	ProductName  string  `json:"product_name,omitempty"`
	Qty          float64 `json:"qty,omitempty"`
	PricePerUnit float64 `json:"price_per_unit,omitempty"`
	TotalAmount  float64 `json:"total_amount,omitempty"`
	RawVoiceText string  `json:"raw_voice_text,omitempty"`
	CreatedAt    string  `json:"created_at,omitempty"`
}

// Inventory types
type Inventory struct {
	ID           string  `json:"id,omitempty"`
	UserID       string  `json:"user_id"`
	ProductName  string  `json:"product_name"`
	StockQty     float64 `json:"stock_qty"`
	Unit         string  `json:"unit"`
	MinSellPrice float64 `json:"min_sell_price,omitempty"`
	MaxBuyPrice  float64 `json:"max_buy_price,omitempty"`
	Description  string  `json:"description,omitempty"`
}

// NegotiationLog types
type NegotiationLog struct {
	ID           string  `json:"id,omitempty"`
	BuyerID      string  `json:"buyer_id"`
	SellerID     string  `json:"seller_id,omitempty"`
	ProductName  string  `json:"product_name"`
	InitialOffer float64 `json:"initial_offer"`
	FinalPrice   float64 `json:"final_price,omitempty"`
	Status       string  `json:"status"` // PENDING, SUCCESS, FAILED, CANCELLED, EXPIRED
	Transcript   any     `json:"transcript,omitempty"`
	CreatedAt    string  `json:"created_at,omitempty"`
	CompletedAt  string  `json:"completed_at,omitempty"`
}

// User types
type User struct {
	ID               string `json:"id,omitempty"`
	Email            string `json:"email,omitempty"`
	PhoneNumber      string `json:"phone_number,omitempty"`
	Name             string `json:"name,omitempty"`
	Role             string `json:"role,omitempty"`
	PreferredDialect string `json:"preferred_dialect,omitempty"`
}

// CreateTransaction inserts a new transaction
func (s *SupabaseClient) CreateTransaction(ctx context.Context, tx *Transaction) error {
	var result []Transaction
	err := s.request(ctx, "POST", "transactions", tx, &result)
	if err != nil {
		return err
	}
	if len(result) > 0 {
		tx.ID = result[0].ID
		tx.CreatedAt = result[0].CreatedAt
	}
	return nil
}

// GetUserByPhone finds user by phone number
func (s *SupabaseClient) GetUserByPhone(ctx context.Context, phone string) (*User, error) {
	var users []User
	endpoint := fmt.Sprintf("users?phone_number=eq.%s", phone)
	err := s.request(ctx, "GET", endpoint, nil, &users)
	if err != nil {
		return nil, err
	}
	if len(users) == 0 {
		return nil, nil
	}
	return &users[0], nil
}

// GetInventoryByProduct finds inventory by product name for a user
func (s *SupabaseClient) GetInventoryByProduct(ctx context.Context, userID, productName string) (*Inventory, error) {
	var items []Inventory
	endpoint := fmt.Sprintf("inventory?user_id=eq.%s&product_name=ilike.%%%s%%", userID, productName)
	err := s.request(ctx, "GET", endpoint, nil, &items)
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, nil
	}
	return &items[0], nil
}

// UpdateInventoryStock updates stock quantity
func (s *SupabaseClient) UpdateInventoryStock(ctx context.Context, inventoryID string, newQty float64) error {
	update := map[string]any{"stock_qty": newQty}
	endpoint := fmt.Sprintf("inventory?id=eq.%s", inventoryID)
	return s.request(ctx, "PATCH", endpoint, update, nil)
}

// FindSellers finds sellers with a specific product
func (s *SupabaseClient) FindSellers(ctx context.Context, productName string, maxPrice float64) ([]Inventory, error) {
	var items []Inventory
	endpoint := fmt.Sprintf("inventory?product_name=ilike.%%%s%%&stock_qty=gt.0&min_sell_price=lte.%f&select=*,users(*)",
		productName, maxPrice)
	err := s.request(ctx, "GET", endpoint, nil, &items)
	return items, err
}

// CreateNegotiationLog creates a new negotiation record
func (s *SupabaseClient) CreateNegotiationLog(ctx context.Context, log *NegotiationLog) error {
	var result []NegotiationLog
	err := s.request(ctx, "POST", "negotiation_logs", log, &result)
	if err != nil {
		return err
	}
	if len(result) > 0 {
		log.ID = result[0].ID
		log.CreatedAt = result[0].CreatedAt
	}
	return nil
}

// UpdateNegotiationLog updates negotiation status
func (s *SupabaseClient) UpdateNegotiationLog(ctx context.Context, id string, updates map[string]any) error {
	endpoint := fmt.Sprintf("negotiation_logs?id=eq.%s", id)
	return s.request(ctx, "PATCH", endpoint, updates, nil)
}
