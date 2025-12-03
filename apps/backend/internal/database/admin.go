package database

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"time"
)

// AdminClient handles Supabase Admin API operations
type AdminClient struct {
	supabaseURL string
	serviceKey  string
	httpClient  *http.Client
}

// NewAdminClient creates a new Supabase Admin API client
func NewAdminClient(supabaseURL, serviceKey string) *AdminClient {
	return &AdminClient{
		supabaseURL: supabaseURL,
		serviceKey:  serviceKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// User represents a Supabase Auth user
type User struct {
	ID           string                 `json:"id"`
	Email        string                 `json:"email"`
	Phone        string                 `json:"phone"`
	UserMetadata map[string]interface{} `json:"user_metadata"`
	CreatedAt    time.Time              `json:"created_at"`
}

// CreateUserRequest represents the request body for creating a user
type CreateUserRequest struct {
	Email        string                 `json:"email"`
	Phone        string                 `json:"phone,omitempty"`
	Password     string                 `json:"password"`
	EmailConfirm bool                   `json:"email_confirm"`
	UserMetadata map[string]interface{} `json:"user_metadata,omitempty"`
}

// CreateUserResponse represents the response from creating a user
type CreateUserResponse struct {
	ID           string                 `json:"id"`
	Email        string                 `json:"email"`
	Phone        string                 `json:"phone"`
	UserMetadata map[string]interface{} `json:"user_metadata"`
	CreatedAt    string                 `json:"created_at"`
}

// ErrorResponse represents an error response from Supabase
type ErrorResponse struct {
	Message string `json:"message"`
	Code    string `json:"code"`
}

// CreateUser creates a new user in Supabase Auth with metadata
func (c *AdminClient) CreateUser(ctx context.Context, email, phone, password string, metadata map[string]interface{}) (*User, error) {
	// Generate random password if not provided
	if password == "" {
		password = generateRandomPassword(16)
	}

	// Prepare request body
	reqBody := CreateUserRequest{
		Email:        email,
		Phone:        phone,
		Password:     password,
		EmailConfirm: false, // User needs to verify email
		UserMetadata: metadata,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create request with retry logic
	var lastErr error
	for attempt := 1; attempt <= 3; attempt++ {
		user, err := c.createUserWithRetry(ctx, jsonData)
		if err == nil {
			return user, nil
		}

		lastErr = err

		// Check if it's a duplicate error
		if isDuplicateError(err) {
			return nil, fmt.Errorf("user already exists with email: %s", email)
		}

		// Exponential backoff
		if attempt < 3 {
			backoff := time.Duration(attempt) * time.Second
			time.Sleep(backoff)
		}
	}

	return nil, fmt.Errorf("failed to create user after 3 attempts: %w", lastErr)
}

// createUserWithRetry performs a single attempt to create a user
func (c *AdminClient) createUserWithRetry(ctx context.Context, jsonData []byte) (*User, error) {
	url := fmt.Sprintf("%s/auth/v1/admin/users", c.supabaseURL)

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.serviceKey))
	req.Header.Set("apikey", c.serviceKey)

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check status code
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		var errResp ErrorResponse
		if err := json.Unmarshal(body, &errResp); err == nil {
			return nil, fmt.Errorf("API error (%d): %s", resp.StatusCode, errResp.Message)
		}
		return nil, fmt.Errorf("API error (%d): %s", resp.StatusCode, string(body))
	}

	// Parse response
	var userResp CreateUserResponse
	if err := json.Unmarshal(body, &userResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	// Convert to User struct
	createdAt, _ := time.Parse(time.RFC3339, userResp.CreatedAt)
	user := &User{
		ID:           userResp.ID,
		Email:        userResp.Email,
		Phone:        userResp.Phone,
		UserMetadata: userResp.UserMetadata,
		CreatedAt:    createdAt,
	}

	return user, nil
}

// UpdateUser updates an existing user's metadata
func (c *AdminClient) UpdateUser(ctx context.Context, userID string, updates map[string]interface{}) error {
	url := fmt.Sprintf("%s/auth/v1/admin/users/%s", c.supabaseURL, userID)

	jsonData, err := json.Marshal(updates)
	if err != nil {
		return fmt.Errorf("failed to marshal updates: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "PUT", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.serviceKey))
	req.Header.Set("apikey", c.serviceKey)

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API error (%d): %s", resp.StatusCode, string(body))
	}

	return nil
}

// DeleteUser deletes a user from Supabase Auth
func (c *AdminClient) DeleteUser(ctx context.Context, userID string) error {
	url := fmt.Sprintf("%s/auth/v1/admin/users/%s", c.supabaseURL, userID)

	req, err := http.NewRequestWithContext(ctx, "DELETE", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.serviceKey))
	req.Header.Set("apikey", c.serviceKey)

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API error (%d): %s", resp.StatusCode, string(body))
	}

	return nil
}

// SendPasswordResetEmail sends a password reset email to the user
func (c *AdminClient) SendPasswordResetEmail(ctx context.Context, email string) error {
	url := fmt.Sprintf("%s/auth/v1/recover", c.supabaseURL)

	reqBody := map[string]string{
		"email": email,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", c.serviceKey)

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API error (%d): %s", resp.StatusCode, string(body))
	}

	return nil
}

// generateRandomPassword generates a random password
func generateRandomPassword(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
	seededRand := rand.New(rand.NewSource(time.Now().UnixNano()))

	password := make([]byte, length)
	for i := range password {
		password[i] = charset[seededRand.Intn(len(charset))]
	}

	return string(password)
}

// isDuplicateError checks if the error is a duplicate user error
func isDuplicateError(err error) bool {
	if err == nil {
		return false
	}
	errMsg := err.Error()
	return contains(errMsg, "already exists") ||
		contains(errMsg, "duplicate") ||
		contains(errMsg, "unique constraint")
}

// contains checks if a string contains a substring (case-insensitive)
func contains(s, substr string) bool {
	return len(s) >= len(substr) &&
		(s == substr || len(s) > len(substr) &&
			(s[:len(substr)] == substr || s[len(s)-len(substr):] == substr ||
				findSubstring(s, substr)))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
