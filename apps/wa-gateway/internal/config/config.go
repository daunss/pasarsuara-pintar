package config

import (
	"os"
)

type Config struct {
	Port        string
	SessionPath string
	BackendURL  string
	APIKey      string
}

func Load() *Config {
	return &Config{
		Port:        getEnv("WA_GATEWAY_PORT", "8081"),
		SessionPath: getEnv("WA_SESSION_PATH", "./session"),
		BackendURL:  getEnv("BACKEND_URL", "http://localhost:8080"),
		APIKey:      getEnv("WA_GATEWAY_API_KEY", ""),
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
