package api

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/pasarsuara/backend/internal/database"
)

// Property 1: Authentication token validity
// For any authenticated user session, the JWT token should remain valid until expiration time
// and should be rejected after expiration
func TestTokenValidity(t *testing.T) {
	handler := &AuthHandler{}

	// Test case 1: Valid token should be accepted
	user := &database.User{
		ID:    "test-user-id",
		Email: "test@example.com",
		Role:  "umkm",
	}

	token, err := handler.generateToken(user)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	// Validate the token
	claims, err := ValidateToken(token)
	if err != nil {
		t.Fatalf("Valid token was rejected: %v", err)
	}

	if claims.UserID != user.ID {
		t.Errorf("Expected UserID %s, got %s", user.ID, claims.UserID)
	}

	if claims.Email != user.Email {
		t.Errorf("Expected Email %s, got %s", user.Email, claims.Email)
	}

	// Test case 2: Expired token should be rejected
	expiredClaims := Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)), // Expired 1 hour ago
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
			Issuer:    "pasarsuara-backend",
		},
	}

	expiredToken := jwt.NewWithClaims(jwt.SigningMethodHS256, expiredClaims)
	secret := "your-secret-key-change-in-production"
	expiredTokenString, _ := expiredToken.SignedString([]byte(secret))

	_, err = ValidateToken(expiredTokenString)
	if err == nil {
		t.Error("Expired token should be rejected")
	}

	// Test case 3: Invalid signature should be rejected
	invalidToken := token + "tampered"
	_, err = ValidateToken(invalidToken)
	if err == nil {
		t.Error("Token with invalid signature should be rejected")
	}
}

// Test token expiration time
func TestTokenExpirationTime(t *testing.T) {
	handler := &AuthHandler{}
	user := &database.User{
		ID:    "test-user-id",
		Email: "test@example.com",
		Role:  "umkm",
	}

	token, err := handler.generateToken(user)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	claims, err := ValidateToken(token)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	// Token should expire in approximately 24 hours
	expiresIn := time.Until(claims.ExpiresAt.Time)
	expectedExpiry := 24 * time.Hour

	// Allow 1 minute tolerance
	tolerance := 1 * time.Minute
	if expiresIn < expectedExpiry-tolerance || expiresIn > expectedExpiry+tolerance {
		t.Errorf("Expected token to expire in ~24 hours, got %v", expiresIn)
	}
}
