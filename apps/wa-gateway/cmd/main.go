package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	port := os.Getenv("WA_GATEWAY_PORT")
	if port == "" {
		port = "8081"
	}

	log.Printf("📱 PasarSuara WA Gateway starting on port %s", port)
	// TODO: Initialize whatsmeow client and connect to WhatsApp
}
