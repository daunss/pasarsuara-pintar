package agents

import (
	"context"
	"fmt"
	"log"
	"strings"

	appcontext "github.com/pasarsuara/backend/internal/context"
	"github.com/pasarsuara/backend/internal/database"
)

// OnboardingAgent handles user registration and onboarding
type OnboardingAgent struct {
	db         *database.SupabaseClient
	contextMgr *appcontext.ConversationManager
}

// OnboardingState represents the current onboarding step
type OnboardingState string

const (
	StateNone         OnboardingState = "NONE"
	StateAwaitingName OnboardingState = "AWAITING_NAME"
	StateAwaitingType OnboardingState = "AWAITING_TYPE"
	StateAwaitingCity OnboardingState = "AWAITING_CITY"
	StateComplete     OnboardingState = "COMPLETE"
)

// OnboardingData stores user registration data
type OnboardingData struct {
	Phone        string
	Name         string
	BusinessType string
	City         string
	State        OnboardingState
}

func NewOnboardingAgent(db *database.SupabaseClient, contextMgr *appcontext.ConversationManager) *OnboardingAgent {
	return &OnboardingAgent{
		db:         db,
		contextMgr: contextMgr,
	}
}

// IsNewUser checks if user needs onboarding
func (o *OnboardingAgent) IsNewUser(ctx context.Context, phone string) bool {
	if o.db == nil {
		return false // Demo mode, no onboarding needed
	}

	user, err := o.db.GetUserByPhone(ctx, phone)
	if err != nil || user == nil {
		return true
	}

	// Check if user has completed onboarding
	return user.Name == "" || user.Role == ""
}

// StartOnboarding initiates the onboarding process
func (o *OnboardingAgent) StartOnboarding(phone string) string {
	// Store onboarding state
	if o.contextMgr != nil {
		data := map[string]interface{}{
			"onboarding_state": StateAwaitingName,
			"phone":            phone,
		}
		o.contextMgr.AddMessage(phone, "system", "onboarding_started", "ONBOARDING", data)
	}

	return `👋 *Selamat datang di PasarSuara Pintar!*

Saya akan bantu Anda daftar. Butuh beberapa info dulu ya:

📝 *Nama bisnis Anda?*
Contoh: Warung Bu Siti, Toko Pak Budi, dll.`
}

// ProcessOnboardingStep processes each step of onboarding
func (o *OnboardingAgent) ProcessOnboardingStep(ctx context.Context, phone, message string) string {
	// Get current state from context
	state := o.getCurrentState(phone)

	switch state {
	case StateAwaitingName:
		return o.processName(phone, message)
	case StateAwaitingType:
		return o.processBusinessType(phone, message)
	case StateAwaitingCity:
		return o.processCity(ctx, phone, message)
	default:
		return o.StartOnboarding(phone)
	}
}

func (o *OnboardingAgent) getCurrentState(phone string) OnboardingState {
	if o.contextMgr == nil {
		return StateNone
	}

	entities := o.contextMgr.GetLastEntities(phone)
	if state, ok := entities["onboarding_state"]; ok {
		if stateStr, ok := state.(string); ok {
			return OnboardingState(stateStr)
		}
	}

	return StateNone
}

func (o *OnboardingAgent) processName(phone, name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return "Nama bisnis tidak boleh kosong. Coba lagi ya!"
	}

	// Store name and move to next step
	if o.contextMgr != nil {
		data := map[string]interface{}{
			"onboarding_state": StateAwaitingType,
			"phone":            phone,
			"name":             name,
		}
		o.contextMgr.AddMessage(phone, "system", "name_collected", "ONBOARDING", data)
	}

	return fmt.Sprintf(`✅ Nama bisnis: *%s*

🏪 *Jenis usaha Anda?*
Pilih salah satu:
1️⃣ Warung/Toko
2️⃣ Warung Makan
3️⃣ Pedagang Pasar
4️⃣ Supplier
5️⃣ Lainnya

Ketik angka atau nama jenis usaha.`, name)
}

func (o *OnboardingAgent) processBusinessType(phone, businessType string) string {
	businessType = strings.TrimSpace(strings.ToLower(businessType))

	// Map input to business type
	typeMap := map[string]string{
		"1":            "Warung/Toko",
		"warung":       "Warung/Toko",
		"toko":         "Warung/Toko",
		"2":            "Warung Makan",
		"warung makan": "Warung Makan",
		"makan":        "Warung Makan",
		"3":            "Pedagang Pasar",
		"pedagang":     "Pedagang Pasar",
		"pasar":        "Pedagang Pasar",
		"4":            "Supplier",
		"supplier":     "Supplier",
		"5":            "Lainnya",
		"lainnya":      "Lainnya",
	}

	finalType := typeMap[businessType]
	if finalType == "" {
		finalType = "Lainnya"
	}

	// Store type and move to next step
	if o.contextMgr != nil {
		entities := o.contextMgr.GetLastEntities(phone)
		data := map[string]interface{}{
			"onboarding_state": StateAwaitingCity,
			"phone":            phone,
			"name":             entities["name"],
			"business_type":    finalType,
		}
		o.contextMgr.AddMessage(phone, "system", "type_collected", "ONBOARDING", data)
	}

	return fmt.Sprintf(`✅ Jenis usaha: *%s*

📍 *Lokasi/Kota Anda?*
Contoh: Jakarta, Bandung, Surabaya, dll.`, finalType)
}

func (o *OnboardingAgent) processCity(ctx context.Context, phone, city string) string {
	city = strings.TrimSpace(city)
	if city == "" {
		return "Lokasi tidak boleh kosong. Coba lagi ya!"
	}

	// Get all collected data
	entities := o.contextMgr.GetLastEntities(phone)
	name := ""
	businessType := ""

	if n, ok := entities["name"]; ok {
		if nameStr, ok := n.(string); ok {
			name = nameStr
		}
	}
	if bt, ok := entities["business_type"]; ok {
		if btStr, ok := bt.(string); ok {
			businessType = btStr
		}
	}

	// Create user in database
	if o.db != nil {
		user := &database.User{
			Phone:            phone,
			Name:             name,
			Role:             "owner", // Default role
			PreferredDialect: "id",    // Default to Indonesian
		}

		err := o.db.CreateUser(ctx, user)
		if err != nil {
			log.Printf("❌ Failed to create user: %v", err)
			return "Maaf, terjadi kesalahan saat mendaftar. Coba lagi nanti ya!"
		}

		// Create default user preferences
		prefs := &database.UserPreferences{
			UserID:               user.ID,
			Language:             "id",
			Currency:             "IDR",
			Timezone:             "Asia/Jakarta",
			NotificationEnabled:  true,
			NotificationChannels: []string{"whatsapp"},
			LowStockThreshold:    10,
			ReportFrequency:      "daily",
			Theme:                "light",
		}

		err = o.db.CreateUserPreferences(ctx, prefs)
		if err != nil {
			log.Printf("⚠️ Failed to create user preferences: %v", err)
			// Non-critical, continue
		}

		log.Printf("✅ User registered: %s (%s) from %s - ID: %s", name, businessType, city, user.ID)
	}

	// Clear onboarding state
	if o.contextMgr != nil {
		data := map[string]interface{}{
			"onboarding_state": StateComplete,
		}
		o.contextMgr.AddMessage(phone, "system", "onboarding_complete", "ONBOARDING", data)
	}

	return fmt.Sprintf(`🎉 *Pendaftaran Berhasil!*

✅ Nama: %s
✅ Jenis: %s
✅ Lokasi: %s

Akun Anda sudah aktif! Sekarang Anda bisa:
• 📝 Catat penjualan: "laku nasi 10 porsi 15rb"
• 🛒 Pesan barang: "cari beras 25kg"
• 📊 Cek laporan: "laporan hari ini"
• 📦 Cek stok: "stok beras berapa"

Ada yang bisa saya bantu? 😊`, name, businessType, city)
}

// IsOnboarding checks if user is currently in onboarding process
func (o *OnboardingAgent) IsOnboarding(phone string) bool {
	state := o.getCurrentState(phone)
	return state != StateNone && state != StateComplete
}
