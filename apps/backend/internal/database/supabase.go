package database

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
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
	Phone            string `json:"phone,omitempty"`
	Name             string `json:"name,omitempty"`
	Role             string `json:"role,omitempty"`
	PreferredDialect string `json:"preferred_dialect,omitempty"`
	PasswordHash     string `json:"password_hash,omitempty"`
	CreatedAt        string `json:"created_at,omitempty"`
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

// GetUserByPhone finds user by phone number from auth metadata
func (s *SupabaseClient) GetUserByPhone(ctx context.Context, phone string) (*User, error) {
	// Try to get from cache first
	if userID, exists := phoneToUserCache[phone]; exists {
		return &User{ID: userID, Phone: phone}, nil
	}

	// Query public.users table by phone_number
	// Normalize phone format: remove + and spaces
	normalizedPhone := strings.ReplaceAll(strings.ReplaceAll(phone, "+", ""), " ", "")

	var users []User
	// Try exact match first
	endpoint := fmt.Sprintf("users?phone_number=eq.+%s&select=id,email,phone_number,name", normalizedPhone)
	err := s.request(ctx, "GET", endpoint, nil, &users)

	if err == nil && len(users) > 0 {
		user := users[0]
		// Cache for future lookups
		phoneToUserCache[phone] = user.ID
		log.Printf("✅ Found user by phone: %s -> %s (%s)", phone, user.ID, user.Email)
		return &user, nil
	}

	// Try without + prefix
	endpoint = fmt.Sprintf("users?phone_number=eq.%s&select=id,email,phone_number,name", normalizedPhone)
	err = s.request(ctx, "GET", endpoint, nil, &users)

	if err == nil && len(users) > 0 {
		user := users[0]
		// Cache for future lookups
		phoneToUserCache[phone] = user.ID
		log.Printf("✅ Found user by phone: %s -> %s (%s)", phone, user.ID, user.Email)
		return &user, nil
	}

	// Try with LIKE for partial match
	endpoint = fmt.Sprintf("users?phone_number=like.*%s*&select=id,email,phone_number,name", normalizedPhone)
	err = s.request(ctx, "GET", endpoint, nil, &users)

	if err == nil && len(users) > 0 {
		user := users[0]
		// Cache for future lookups
		phoneToUserCache[phone] = user.ID
		log.Printf("✅ Found user by phone (partial): %s -> %s (%s)", phone, user.ID, user.Email)
		return &user, nil
	}

	log.Printf("⚠️ User not found for phone: %s", phone)
	return nil, fmt.Errorf("user not found for phone: %s", phone)
}

// Phone to user ID cache for quick lookups
var phoneToUserCache = make(map[string]string)

// RegisterPhoneMapping adds phone to user ID mapping
// Call this after user registration
func (s *SupabaseClient) RegisterPhoneMapping(phone, userID string) {
	phoneToUserCache[phone] = userID
	log.Printf("✅ Registered phone mapping: %s -> %s", phone, userID)
}

// GetInventoryByProduct finds inventory by product name for a user
func (s *SupabaseClient) GetInventoryByProduct(ctx context.Context, userID, productName string) (*Inventory, error) {
	var items []Inventory
	// Use case-insensitive partial match with proper URL encoding
	// %25 = %, so %25%s%25 becomes %productName%
	endpoint := fmt.Sprintf("inventory?user_id=eq.%s&product_name=ilike.%%25%s%%25&select=*", userID, productName)
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

// ============ PHASE 3: Additional Tables ============

// ProductCatalog types
type ProductCatalog struct {
	ID           string  `json:"id,omitempty"`
	UserID       string  `json:"user_id"`
	ProductName  string  `json:"product_name"`
	Category     string  `json:"category,omitempty"`
	Description  string  `json:"description,omitempty"`
	DefaultPrice float64 `json:"default_price,omitempty"`
	DefaultUnit  string  `json:"default_unit,omitempty"`
	ImageURL     string  `json:"image_url,omitempty"`
	SKU          string  `json:"sku,omitempty"`
	IsActive     bool    `json:"is_active"`
	CreatedAt    string  `json:"created_at,omitempty"`
	UpdatedAt    string  `json:"updated_at,omitempty"`
}

// Contact types
type Contact struct {
	ID                string  `json:"id,omitempty"`
	UserID            string  `json:"user_id"`
	Type              string  `json:"type"` // SUPPLIER, CUSTOMER
	Name              string  `json:"name"`
	Phone             string  `json:"phone,omitempty"`
	Email             string  `json:"email,omitempty"`
	Address           string  `json:"address,omitempty"`
	City              string  `json:"city,omitempty"`
	Notes             string  `json:"notes,omitempty"`
	Rating            float64 `json:"rating,omitempty"`
	TotalTransactions int     `json:"total_transactions,omitempty"`
	IsActive          bool    `json:"is_active"`
	CreatedAt         string  `json:"created_at,omitempty"`
	UpdatedAt         string  `json:"updated_at,omitempty"`
}

// Payment types
type Payment struct {
	ID              string  `json:"id,omitempty"`
	TransactionID   string  `json:"transaction_id"`
	Amount          float64 `json:"amount"`
	PaymentMethod   string  `json:"payment_method,omitempty"` // CASH, TRANSFER, CREDIT, DEBIT, EWALLET
	Status          string  `json:"status"`                   // PAID, PENDING, PARTIAL, FAILED, REFUNDED
	ReferenceNumber string  `json:"reference_number,omitempty"`
	Notes           string  `json:"notes,omitempty"`
	PaidAt          string  `json:"paid_at,omitempty"`
	CreatedAt       string  `json:"created_at,omitempty"`
	UpdatedAt       string  `json:"updated_at,omitempty"`
}

// AuditLog types
type AuditLog struct {
	ID         string `json:"id,omitempty"`
	UserID     string `json:"user_id,omitempty"`
	Action     string `json:"action"`
	EntityType string `json:"entity_type,omitempty"`
	EntityID   string `json:"entity_id,omitempty"`
	OldData    any    `json:"old_data,omitempty"`
	NewData    any    `json:"new_data,omitempty"`
	IPAddress  string `json:"ip_address,omitempty"`
	UserAgent  string `json:"user_agent,omitempty"`
	CreatedAt  string `json:"created_at,omitempty"`
}

// UserPreferences types
type UserPreferences struct {
	ID                   string   `json:"id,omitempty"`
	UserID               string   `json:"user_id"`
	Language             string   `json:"language,omitempty"`
	Currency             string   `json:"currency,omitempty"`
	Timezone             string   `json:"timezone,omitempty"`
	NotificationEnabled  bool     `json:"notification_enabled"`
	NotificationChannels []string `json:"notification_channels,omitempty"`
	LowStockThreshold    int      `json:"low_stock_threshold,omitempty"`
	ReportFrequency      string   `json:"report_frequency,omitempty"`
	Theme                string   `json:"theme,omitempty"`
	CreatedAt            string   `json:"created_at,omitempty"`
	UpdatedAt            string   `json:"updated_at,omitempty"`
}

// NotificationQueue types
type NotificationQueue struct {
	ID           string `json:"id,omitempty"`
	UserID       string `json:"user_id"`
	Type         string `json:"type"`
	Title        string `json:"title"`
	Message      string `json:"message"`
	Channel      string `json:"channel"` // whatsapp, email, push
	Status       string `json:"status"`  // PENDING, SENT, FAILED, CANCELLED
	ScheduledAt  string `json:"scheduled_at,omitempty"`
	SentAt       string `json:"sent_at,omitempty"`
	ErrorMessage string `json:"error_message,omitempty"`
	RetryCount   int    `json:"retry_count,omitempty"`
	CreatedAt    string `json:"created_at,omitempty"`
}

// CreateProductCatalog creates a new product in catalog
func (s *SupabaseClient) CreateProductCatalog(ctx context.Context, product *ProductCatalog) error {
	var result []ProductCatalog
	err := s.request(ctx, "POST", "product_catalog", product, &result)
	if err != nil {
		return err
	}
	if len(result) > 0 {
		*product = result[0]
	}
	return nil
}

// GetProductCatalog gets products from catalog
func (s *SupabaseClient) GetProductCatalog(ctx context.Context, userID string, activeOnly bool) ([]ProductCatalog, error) {
	var products []ProductCatalog
	endpoint := fmt.Sprintf("product_catalog?user_id=eq.%s", userID)
	if activeOnly {
		endpoint += "&is_active=eq.true"
	}
	endpoint += "&order=product_name.asc"
	err := s.request(ctx, "GET", endpoint, nil, &products)
	return products, err
}

// UpdateProductCatalog updates a product in catalog
func (s *SupabaseClient) UpdateProductCatalog(ctx context.Context, id string, updates map[string]any) error {
	endpoint := fmt.Sprintf("product_catalog?id=eq.%s", id)
	return s.request(ctx, "PATCH", endpoint, updates, nil)
}

// CreateContact creates a new contact (supplier or customer)
func (s *SupabaseClient) CreateContact(ctx context.Context, contact *Contact) error {
	var result []Contact
	err := s.request(ctx, "POST", "contacts", contact, &result)
	if err != nil {
		return err
	}
	if len(result) > 0 {
		*contact = result[0]
	}
	return nil
}

// GetContacts gets contacts by type
func (s *SupabaseClient) GetContacts(ctx context.Context, userID, contactType string) ([]Contact, error) {
	var contacts []Contact
	endpoint := fmt.Sprintf("contacts?user_id=eq.%s", userID)
	if contactType != "" {
		endpoint += fmt.Sprintf("&type=eq.%s", contactType)
	}
	endpoint += "&is_active=eq.true&order=name.asc"
	err := s.request(ctx, "GET", endpoint, nil, &contacts)
	return contacts, err
}

// UpdateContact updates a contact
func (s *SupabaseClient) UpdateContact(ctx context.Context, id string, updates map[string]any) error {
	endpoint := fmt.Sprintf("contacts?id=eq.%s", id)
	return s.request(ctx, "PATCH", endpoint, updates, nil)
}

// CreatePayment creates a payment record
func (s *SupabaseClient) CreatePayment(ctx context.Context, payment *Payment) error {
	var result []Payment
	err := s.request(ctx, "POST", "payments", payment, &result)
	if err != nil {
		return err
	}
	if len(result) > 0 {
		*payment = result[0]
	}
	return nil
}

// GetPaymentsByTransaction gets payments for a transaction
func (s *SupabaseClient) GetPaymentsByTransaction(ctx context.Context, transactionID string) ([]Payment, error) {
	var payments []Payment
	endpoint := fmt.Sprintf("payments?transaction_id=eq.%s&order=created_at.desc", transactionID)
	err := s.request(ctx, "GET", endpoint, nil, &payments)
	return payments, err
}

// UpdatePayment updates a payment record
func (s *SupabaseClient) UpdatePayment(ctx context.Context, id string, updates map[string]any) error {
	endpoint := fmt.Sprintf("payments?id=eq.%s", id)
	return s.request(ctx, "PATCH", endpoint, updates, nil)
}

// LogAudit creates an audit log entry
func (s *SupabaseClient) LogAudit(ctx context.Context, log *AuditLog) error {
	var result []AuditLog
	err := s.request(ctx, "POST", "audit_logs", log, &result)
	if err != nil {
		return err
	}
	if len(result) > 0 {
		*log = result[0]
	}
	return nil
}

// GetAuditLogs gets audit logs for a user
func (s *SupabaseClient) GetAuditLogs(ctx context.Context, userID string, limit int) ([]AuditLog, error) {
	var logs []AuditLog
	endpoint := fmt.Sprintf("audit_logs?user_id=eq.%s&order=created_at.desc", userID)
	if limit > 0 {
		endpoint += fmt.Sprintf("&limit=%d", limit)
	}
	err := s.request(ctx, "GET", endpoint, nil, &logs)
	return logs, err
}

// CreateUserPreferences creates user preferences
func (s *SupabaseClient) CreateUserPreferences(ctx context.Context, prefs *UserPreferences) error {
	var result []UserPreferences
	err := s.request(ctx, "POST", "user_preferences", prefs, &result)
	if err != nil {
		return err
	}
	if len(result) > 0 {
		*prefs = result[0]
	}
	return nil
}

// GetUserPreferences gets user preferences
func (s *SupabaseClient) GetUserPreferences(ctx context.Context, userID string) (*UserPreferences, error) {
	var prefs []UserPreferences
	endpoint := fmt.Sprintf("user_preferences?user_id=eq.%s", userID)
	err := s.request(ctx, "GET", endpoint, nil, &prefs)
	if err != nil {
		return nil, err
	}
	if len(prefs) == 0 {
		return nil, nil
	}
	return &prefs[0], nil
}

// UpdateUserPreferences updates user preferences
func (s *SupabaseClient) UpdateUserPreferences(ctx context.Context, userID string, updates map[string]any) error {
	endpoint := fmt.Sprintf("user_preferences?user_id=eq.%s", userID)
	return s.request(ctx, "PATCH", endpoint, updates, nil)
}

// CreateNotification creates a notification in queue
func (s *SupabaseClient) CreateNotification(ctx context.Context, notif *NotificationQueue) error {
	var result []NotificationQueue
	err := s.request(ctx, "POST", "notification_queue", notif, &result)
	if err != nil {
		return err
	}
	if len(result) > 0 {
		*notif = result[0]
	}
	return nil
}

// GetPendingNotifications gets pending notifications
func (s *SupabaseClient) GetPendingNotifications(ctx context.Context, limit int) ([]NotificationQueue, error) {
	var notifs []NotificationQueue
	endpoint := "notification_queue?status=eq.PENDING&order=scheduled_at.asc"
	if limit > 0 {
		endpoint += fmt.Sprintf("&limit=%d", limit)
	}
	err := s.request(ctx, "GET", endpoint, nil, &notifs)
	return notifs, err
}

// UpdateNotification updates a notification status
func (s *SupabaseClient) UpdateNotification(ctx context.Context, id string, updates map[string]any) error {
	endpoint := fmt.Sprintf("notification_queue?id=eq.%s", id)
	return s.request(ctx, "PATCH", endpoint, updates, nil)
}

// CreateUser creates a new user
func (s *SupabaseClient) CreateUser(ctx context.Context, user *User) error {
	var result []User
	err := s.request(ctx, "POST", "users", user, &result)
	if err != nil {
		return err
	}
	if len(result) > 0 {
		*user = result[0]
	}
	return nil
}

// ============ PHASE 5: Marketplace & Orders ============

// Order types
type Order struct {
	ID              string  `json:"id,omitempty"`
	BuyerID         string  `json:"buyer_id"`
	SellerID        string  `json:"seller_id"`
	OrderNumber     string  `json:"order_number"`
	Status          string  `json:"status"` // PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED
	Subtotal        float64 `json:"subtotal"`
	DeliveryFee     float64 `json:"delivery_fee"`
	TotalAmount     float64 `json:"total_amount"`
	DeliveryAddress string  `json:"delivery_address,omitempty"`
	DeliveryNotes   string  `json:"delivery_notes,omitempty"`
	PaymentStatus   string  `json:"payment_status,omitempty"` // PENDING, PAID, FAILED, REFUNDED
	PaymentMethod   string  `json:"payment_method,omitempty"`
	PaidAt          string  `json:"paid_at,omitempty"`
	CreatedAt       string  `json:"created_at,omitempty"`
	UpdatedAt       string  `json:"updated_at,omitempty"`
}

// Delivery types
type Delivery struct {
	ID                 string    `json:"id,omitempty"`
	OrderID            string    `json:"order_id,omitempty"`
	ProviderID         string    `json:"provider_id,omitempty"`
	TrackingNumber     string    `json:"tracking_number,omitempty"`
	Status             string    `json:"status"` // PENDING, PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, FAILED, RETURNED
	PickupAddress      string    `json:"pickup_address,omitempty"`
	DeliveryAddress    string    `json:"delivery_address"`
	RecipientName      string    `json:"recipient_name"`
	RecipientPhone     string    `json:"recipient_phone"`
	DeliveryNotes      string    `json:"delivery_notes,omitempty"`
	DeliveryFee        float64   `json:"delivery_fee"`
	Weight             float64   `json:"weight,omitempty"`
	EstimatedDelivery  time.Time `json:"estimated_delivery,omitempty"`
	ActualDelivery     string    `json:"actual_delivery,omitempty"`
	ProofOfDeliveryURL string    `json:"proof_of_delivery_url,omitempty"`
	DriverName         string    `json:"driver_name,omitempty"`
	DriverPhone        string    `json:"driver_phone,omitempty"`
	CreatedAt          string    `json:"created_at,omitempty"`
	UpdatedAt          string    `json:"updated_at,omitempty"`
}

// GetOrdersByNumber gets orders by order number
func (s *SupabaseClient) GetOrdersByNumber(ctx context.Context, orderNumber string) ([]Order, error) {
	var orders []Order
	endpoint := fmt.Sprintf("orders?order_number=eq.%s", orderNumber)
	err := s.request(ctx, "GET", endpoint, nil, &orders)
	return orders, err
}

// UpdateOrder updates an order
func (s *SupabaseClient) UpdateOrder(ctx context.Context, id string, updates map[string]interface{}) error {
	endpoint := fmt.Sprintf("orders?id=eq.%s", id)
	return s.request(ctx, "PATCH", endpoint, updates, nil)
}

// CreateDelivery creates a delivery record
func (s *SupabaseClient) CreateDelivery(ctx context.Context, delivery *Delivery) error {
	var result []Delivery
	err := s.request(ctx, "POST", "deliveries", delivery, &result)
	if err != nil {
		return err
	}
	if len(result) > 0 {
		*delivery = result[0]
	}
	return nil
}

// GetUserByEmail finds user by email address
func (s *SupabaseClient) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	var users []User
	endpoint := fmt.Sprintf("users?email=eq.%s", email)
	err := s.request(ctx, "GET", endpoint, nil, &users)
	if err != nil {
		return nil, err
	}
	if len(users) == 0 {
		return nil, nil
	}
	return &users[0], nil
}

// GetTransactionsByDate gets transactions for a specific date
func (s *SupabaseClient) GetTransactionsByDate(ctx context.Context, userID, date string) ([]Transaction, error) {
	var transactions []Transaction
	// Format: 2006-01-02
	startDate := date + "T00:00:00Z"
	endDate := date + "T23:59:59Z"
	endpoint := fmt.Sprintf("transactions?user_id=eq.%s&created_at=gte.%s&created_at=lte.%s&order=created_at.desc",
		userID, startDate, endDate)
	err := s.request(ctx, "GET", endpoint, nil, &transactions)
	return transactions, err
}

// GetRecentTransactions gets recent transactions for a user
func (s *SupabaseClient) GetRecentTransactions(ctx context.Context, userID string, limit int) ([]Transaction, error) {
	var transactions []Transaction
	endpoint := fmt.Sprintf("transactions?user_id=eq.%s&order=created_at.desc&limit=%d", userID, limit)
	err := s.request(ctx, "GET", endpoint, nil, &transactions)
	return transactions, err
}

// GetInventoryByUser gets all inventory items for a user
func (s *SupabaseClient) GetInventoryByUser(ctx context.Context, userID string) ([]Inventory, error) {
	var inventory []Inventory
	endpoint := fmt.Sprintf("inventory?user_id=eq.%s&order=product_name.asc", userID)
	err := s.request(ctx, "GET", endpoint, nil, &inventory)
	return inventory, err
}

// GetInventory is an alias for GetInventoryByUser
func (s *SupabaseClient) GetInventory(ctx context.Context, userID string) ([]Inventory, error) {
	return s.GetInventoryByUser(ctx, userID)
}

// GetTransactionsByDateRange gets transactions within a date range
func (s *SupabaseClient) GetTransactionsByDateRange(ctx context.Context, userID, startDate, endDate string) ([]Transaction, error) {
	var transactions []Transaction
	endpoint := fmt.Sprintf("transactions?user_id=eq.%s&created_at=gte.%s&created_at=lte.%s&order=created_at.desc",
		userID, startDate, endDate)
	err := s.request(ctx, "GET", endpoint, nil, &transactions)
	return transactions, err
}

// GetTransactionsByProduct gets transactions for a specific product
func (s *SupabaseClient) GetTransactionsByProduct(ctx context.Context, userID, productName, startDate, endDate string) ([]Transaction, error) {
	var transactions []Transaction
	endpoint := fmt.Sprintf("transactions?user_id=eq.%s&product_name=ilike.*%s*&created_at=gte.%s&created_at=lte.%s&order=created_at.desc",
		userID, productName, startDate, endDate)
	err := s.request(ctx, "GET", endpoint, nil, &transactions)
	return transactions, err
}
