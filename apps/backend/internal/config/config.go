package config

import (
	"os"
	"strings"
)

type Config struct {
	Port                 string
	SupabaseURL          string
	SupabaseKey          string
	KolosalAPIKey        string
	KolosalBaseURL       string
	GeminiAPIKey         string
	WAGatewayURL         string
	WAGatewayKey         string
	MidtransServerKey    string
	MidtransIsProduction bool
}

func Load() *Config {
	return &Config{
		Port:                 getEnv("BACKEND_PORT", "8080"),
		SupabaseURL:          getEnv("SUPABASE_URL", ""),
		SupabaseKey:          getEnv("SUPABASE_SERVICE_ROLE_KEY", ""),
		KolosalAPIKey:        getEnv("KOLOSAL_API_KEY", ""),
		KolosalBaseURL:       getEnv("KOLOSAL_BASE_URL", "https://api.kolosal.ai/v1"),
		GeminiAPIKey:         getEnv("GEMINI_API_KEY", ""),
		WAGatewayURL:         getEnv("WA_GATEWAY_URL", ""),
		WAGatewayKey:         getEnv("WA_GATEWAY_API_KEY", ""),
		MidtransServerKey:    getEnv("MIDTRANS_SERVER_KEY", ""),
		MidtransIsProduction: getEnvBool("MIDTRANS_IS_PRODUCTION", false),
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv(key)))
	if value == "" {
		return fallback
	}
	if value == "true" || value == "1" || value == "yes" {
		return true
	}
	if value == "false" || value == "0" || value == "no" {
		return false
	}
	return fallback
}
