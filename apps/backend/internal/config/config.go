package config

import (
	"os"
)

type Config struct {
	Port           string
	SupabaseURL    string
	SupabaseKey    string
	KolosalAPIKey  string
	KolosalBaseURL string
	GeminiAPIKey   string
}

func Load() *Config {
	return &Config{
		Port:           getEnv("BACKEND_PORT", "8080"),
		SupabaseURL:    getEnv("SUPABASE_URL", ""),
		SupabaseKey:    getEnv("SUPABASE_SERVICE_ROLE_KEY", ""),
		KolosalAPIKey:  getEnv("KOLOSAL_API_KEY", ""),
		KolosalBaseURL: getEnv("KOLOSAL_BASE_URL", "https://api.kolosal.ai/v1"),
		GeminiAPIKey:   getEnv("GEMINI_API_KEY", ""),
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
