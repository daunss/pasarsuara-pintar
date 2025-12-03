package handlers

import (
	"context"

	"github.com/pasarsuara/backend/internal/database"
)

// AdminClientAdapter adapts database.AdminClient to AdminClientInterface
type AdminClientAdapter struct {
	client *database.AdminClient
}

// NewAdminClientAdapter creates a new adapter
func NewAdminClientAdapter(client *database.AdminClient) *AdminClientAdapter {
	return &AdminClientAdapter{client: client}
}

// CreateUser creates a user using the admin client
func (a *AdminClientAdapter) CreateUser(ctx context.Context, email, phone, password string, metadata map[string]interface{}) (*AdminUser, error) {
	user, err := a.client.CreateUser(ctx, email, phone, password, metadata)
	if err != nil {
		return nil, err
	}

	return &AdminUser{
		ID:           user.ID,
		Email:        user.Email,
		Phone:        user.Phone,
		UserMetadata: user.UserMetadata,
	}, nil
}

// SendPasswordResetEmail sends a password reset email
func (a *AdminClientAdapter) SendPasswordResetEmail(ctx context.Context, email string) error {
	return a.client.SendPasswordResetEmail(ctx, email)
}
