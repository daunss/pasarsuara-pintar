package handlers

import (
	"context"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/google/uuid"
)

// RegistrationState tracks user registration progress
type RegistrationState struct {
	UserID       string
	PhoneNumber  string
	Step         string // "business_name", "business_type", "email", "complete"
	BusinessName string
	BusinessType string
	Email        string
	CreatedAt    time.Time
}

// In-memory storage for registration states (in production, use Redis)
var registrationStates = make(map[string]*RegistrationState)

// HandleRegistration processes registration flow via WhatsApp
func HandleRegistration(phoneNumber, message string) string {
	message = strings.ToLower(strings.TrimSpace(message))

	// Check if user wants to register
	if message == "daftar" || message == "register" {
		return StartRegistration(phoneNumber)
	}

	// Check if user is in registration process
	state, exists := registrationStates[phoneNumber]
	if !exists {
		return "" // Not in registration, handle normally
	}

	// Process registration steps
	switch state.Step {
	case "business_name":
		return ProcessBusinessName(phoneNumber, message)
	case "business_type":
		return ProcessBusinessType(phoneNumber, message)
	case "email":
		return ProcessEmail(phoneNumber, message)
	default:
		return "Maaf, terjadi kesalahan. Ketik 'daftar' untuk mulai lagi."
	}
}

// StartRegistration initiates the registration process
func StartRegistration(phoneNumber string) string {
	// Check if already registered
	// TODO: Check database for existing user

	// Create new registration state
	registrationStates[phoneNumber] = &RegistrationState{
		UserID:      uuid.New().String(),
		PhoneNumber: phoneNumber,
		Step:        "business_name",
		CreatedAt:   time.Now(),
	}

	return `🎉 Selamat datang di PasarSuara!

Mari kita setup akun Anda.

Pertanyaan 1/3:
Apa nama bisnis Anda?

Contoh: Warung Bu Siti, Toko Pak Budi`
}

// ProcessBusinessName handles business name input
func ProcessBusinessName(phoneNumber, businessName string) string {
	state := registrationStates[phoneNumber]

	if len(businessName) < 3 {
		return "Nama bisnis terlalu pendek. Minimal 3 karakter.\n\nSilakan ketik nama bisnis Anda:"
	}

	state.BusinessName = businessName
	state.Step = "business_type"

	return fmt.Sprintf(`✅ Nama bisnis: %s

Pertanyaan 2/3:
Jenis usaha Anda?

Pilih salah satu:
1️⃣ Warung Makan
2️⃣ Toko Kelontong
3️⃣ Pedagang Sayur/Buah
4️⃣ Jasa
5️⃣ Lainnya

Ketik angka atau nama jenis usaha:`, businessName)
}

// ProcessBusinessType handles business type input
func ProcessBusinessType(phoneNumber, input string) string {
	state := registrationStates[phoneNumber]

	var businessType string
	switch input {
	case "1", "warung makan", "warung":
		businessType = "Warung Makan"
	case "2", "toko kelontong", "toko":
		businessType = "Toko Kelontong"
	case "3", "pedagang sayur", "sayur", "buah":
		businessType = "Pedagang Sayur/Buah"
	case "4", "jasa":
		businessType = "Jasa"
	case "5", "lainnya":
		businessType = "Lainnya"
	default:
		businessType = input
	}

	state.BusinessType = businessType
	state.Step = "email"

	return fmt.Sprintf(`✅ Jenis usaha: %s

Pertanyaan 3/3:
Email untuk login dashboard?

Contoh: siti@email.com

(Email ini akan digunakan untuk login ke dashboard web)`, businessType)
}

// ProcessEmail handles email input and completes registration
func ProcessEmail(phoneNumber, email string) string {
	state := registrationStates[phoneNumber]

	// Basic email validation
	if !strings.Contains(email, "@") || !strings.Contains(email, ".") {
		return "Email tidak valid. Silakan masukkan email yang benar.\n\nContoh: nama@email.com"
	}

	state.Email = email
	state.Step = "complete"

	// Create user in database
	err := CreateUserInDatabase(state)
	if err != nil {
		return fmt.Sprintf("❌ Registrasi gagal: %v\n\nSilakan coba lagi dengan ketik 'daftar'", err)
	}

	// Clean up registration state
	delete(registrationStates, phoneNumber)

	return fmt.Sprintf(`🎉 Registrasi Berhasil!

📋 Detail Akun:
• Bisnis: %s
• Jenis: %s
• Email: %s
• WhatsApp: %s

✅ Akun Anda sudah aktif!

Sekarang Anda bisa:
1️⃣ Catat transaksi via voice WhatsApp
2️⃣ Login ke dashboard: https://pasarsuara.com/login
3️⃣ Cek email untuk set password dashboard

Coba sekarang! Kirim voice message:
"Tadi laku nasi goreng 10 porsi harga 15 ribu"`,
		state.BusinessName,
		state.BusinessType,
		state.Email,
		phoneNumber)
}

// AdminClient interface for dependency injection
var adminClient AdminClientInterface

// AdminClientInterface defines the interface for admin operations
type AdminClientInterface interface {
	CreateUser(ctx context.Context, email, phone, password string, metadata map[string]interface{}) (*AdminUser, error)
	SendPasswordResetEmail(ctx context.Context, email string) error
}

// AdminUser represents a user from admin client
type AdminUser struct {
	ID           string
	Email        string
	Phone        string
	UserMetadata map[string]interface{}
}

// SetAdminClient sets the admin client for registration handler
func SetAdminClient(client AdminClientInterface) {
	adminClient = client
}

// CreateUserInDatabase creates user in Supabase using Admin API
func CreateUserInDatabase(state *RegistrationState) error {
	if adminClient == nil {
		return fmt.Errorf("admin client not initialized")
	}

	ctx := context.Background()

	// Generate random password for WhatsApp-only users
	password := generateRandomPassword(16)

	// Prepare user metadata
	metadata := map[string]interface{}{
		"business_name":  state.BusinessName,
		"business_type":  state.BusinessType,
		"phone_number":   state.PhoneNumber,
		"registered_via": "whatsapp",
	}

	// Create user in Supabase Auth
	user, err := adminClient.CreateUser(ctx, state.Email, state.PhoneNumber, password, metadata)
	if err != nil {
		// Check if duplicate error
		if strings.Contains(err.Error(), "already exists") {
			return fmt.Errorf("email sudah terdaftar. Gunakan email lain")
		}
		return fmt.Errorf("gagal membuat akun: %v", err)
	}

	// Store user ID
	state.UserID = user.ID

	// Register phone to user ID mapping for future lookups
	// This is CRITICAL for linking WhatsApp messages to dashboard users
	RegisterPhoneToUserMapping(state.PhoneNumber, user.ID)

	// Send password reset email for dashboard access
	if err := adminClient.SendPasswordResetEmail(ctx, state.Email); err != nil {
		// Log error but don't fail registration
		fmt.Printf("Warning: Failed to send password reset email: %v\n", err)
	}

	// Log audit trail
	fmt.Printf("✅ User created successfully: ID=%s, Email=%s, Phone=%s\n",
		user.ID, user.Email, user.Phone)

	return nil
}

// Database client for phone mapping
var dbClient DatabaseClientInterface

// DatabaseClientInterface defines database operations
type DatabaseClientInterface interface {
	RegisterPhoneMapping(phone, userID string)
}

// SetDatabaseClient sets the database client
func SetDatabaseClient(client DatabaseClientInterface) {
	dbClient = client
}

// RegisterPhoneToUserMapping registers phone to user ID mapping
func RegisterPhoneToUserMapping(phone, userID string) {
	if dbClient != nil {
		dbClient.RegisterPhoneMapping(phone, userID)
	}
}

// generateRandomPassword generates a secure random password
func generateRandomPassword(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
	password := make([]byte, length)
	for i := range password {
		password[i] = charset[rand.Intn(len(charset))]
	}
	return string(password)
}

// IsInRegistration checks if user is currently registering
func IsInRegistration(phoneNumber string) bool {
	_, exists := registrationStates[phoneNumber]
	return exists
}
