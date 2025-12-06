package database

import (
	"context"
	"fmt"
)

// GetUserIDByPhone retrieves user ID from phone number
// This is critical for linking WhatsApp messages to dashboard users
func (s *SupabaseClient) GetUserIDByPhone(ctx context.Context, phoneNumber string) (string, error) {
	// Query Supabase Auth users by phone metadata
	// Since phone is stored in user_metadata, we need to use admin API

	// This function is deprecated - use GetUserByPhone from supabase.go instead
	// For now, return error to indicate it needs proper implementation
	return "", fmt.Errorf("GetUserIDByPhone not implemented - use GetUserByPhone instead")
}

// GetUserByPhoneNumber retrieves full user info by phone number
func (s *SupabaseClient) GetUserByPhoneNumber(ctx context.Context, phoneNumber string) (*User, error) {
	userID, err := s.GetUserIDByPhone(ctx, phoneNumber)
	if err != nil {
		return nil, err
	}

	// Get full user details
	user := &User{
		ID:    userID,
		Phone: phoneNumber,
	}

	return user, nil
}

// User type is defined in supabase.go - no need to redeclare

// CacheUserPhoneMapping caches phone to user_id mapping
// This improves performance for frequent lookups
var phoneToUserIDCache = make(map[string]string)

// GetUserIDByPhoneWithCache retrieves user ID with caching
func (s *SupabaseClient) GetUserIDByPhoneWithCache(ctx context.Context, phoneNumber string) (string, error) {
	// Check cache first
	if userID, exists := phoneToUserIDCache[phoneNumber]; exists {
		return userID, nil
	}

	// Query database
	userID, err := s.GetUserIDByPhone(ctx, phoneNumber)
	if err != nil {
		return "", err
	}

	// Cache the result
	phoneToUserIDCache[phoneNumber] = userID

	return userID, nil
}

// InvalidatePhoneCache removes phone from cache
// Call this when user updates their phone number
func InvalidatePhoneCache(phoneNumber string) {
	delete(phoneToUserIDCache, phoneNumber)
}
