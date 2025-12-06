package ai

import (
	"context"
	"fmt"
	"log"
	"time"
)

// AudioProcessingResult represents the result of audio processing with fallback
type AudioProcessingResult struct {
	Success       bool   `json:"success"`
	Transcription string `json:"transcription"`
	Method        string `json:"method"` // "gemini", "fallback", "manual"
	Error         string `json:"error,omitempty"`
	RetryCount    int    `json:"retry_count"`
}

// AudioProcessor handles audio processing with fallback mechanisms
type AudioProcessor struct {
	gemini     *GeminiClient
	maxRetries int
	retryDelay time.Duration
}

func NewAudioProcessor(gemini *GeminiClient) *AudioProcessor {
	return &AudioProcessor{
		gemini:     gemini,
		maxRetries: 3,
		retryDelay: 2 * time.Second,
	}
}

// ProcessAudioWithFallback processes audio with retry and fallback logic
func (ap *AudioProcessor) ProcessAudioWithFallback(ctx context.Context, audioData []byte, mimeType string) *AudioProcessingResult {
	result := &AudioProcessingResult{
		Success: false,
		Method:  "gemini",
	}

	// Validate audio data
	if len(audioData) == 0 {
		result.Error = "Audio data is empty"
		return result
	}

	// Validate audio format
	if !ap.isValidAudioFormat(mimeType) {
		result.Error = fmt.Sprintf("Unsupported audio format: %s", mimeType)
		return ap.attemptFormatConversion(ctx, audioData, mimeType)
	}

	// Validate audio quality
	if !ap.isValidAudioQuality(audioData) {
		log.Printf("⚠️ Audio quality check failed, attempting anyway...")
	}

	// Try primary method (Gemini) with retries
	for i := 0; i < ap.maxRetries; i++ {
		result.RetryCount = i + 1

		transcription, err := ap.gemini.TranscribeAudio(ctx, audioData, mimeType)
		if err == nil && transcription != "" {
			result.Success = true
			result.Transcription = transcription
			result.Method = "gemini"
			return result
		}

		log.Printf("⚠️ Gemini transcription attempt %d failed: %v", i+1, err)

		if i < ap.maxRetries-1 {
			time.Sleep(ap.retryDelay)
		}
	}

	// If all retries failed, try fallback methods
	log.Printf("🔄 Attempting fallback transcription methods...")
	return ap.attemptFallbackTranscription(ctx, audioData, mimeType)
}

// isValidAudioFormat checks if the audio format is supported
func (ap *AudioProcessor) isValidAudioFormat(mimeType string) bool {
	supportedFormats := []string{
		"audio/ogg",
		"audio/mpeg",
		"audio/mp3",
		"audio/wav",
		"audio/webm",
		"audio/m4a",
	}

	for _, format := range supportedFormats {
		if mimeType == format {
			return true
		}
	}

	return false
}

// isValidAudioQuality performs basic quality checks
func (ap *AudioProcessor) isValidAudioQuality(audioData []byte) bool {
	// Check minimum size (at least 1KB)
	if len(audioData) < 1024 {
		return false
	}

	// Check maximum size (max 10MB)
	if len(audioData) > 10*1024*1024 {
		return false
	}

	// TODO: Add more sophisticated quality checks
	// - Check for silence
	// - Check for noise levels
	// - Check for corruption

	return true
}

// attemptFormatConversion tries to convert unsupported formats
func (ap *AudioProcessor) attemptFormatConversion(ctx context.Context, audioData []byte, mimeType string) *AudioProcessingResult {
	result := &AudioProcessingResult{
		Success: false,
		Method:  "conversion",
		Error:   fmt.Sprintf("Format conversion not implemented for %s", mimeType),
	}

	// TODO: Implement format conversion using ffmpeg or similar
	// For now, return error with helpful message

	return result
}

// attemptFallbackTranscription tries alternative transcription methods
func (ap *AudioProcessor) attemptFallbackTranscription(ctx context.Context, audioData []byte, mimeType string) *AudioProcessingResult {
	result := &AudioProcessingResult{
		Success: false,
		Method:  "fallback",
	}

	// Fallback 1: Try with different audio parameters
	log.Printf("🔄 Fallback 1: Trying with adjusted parameters...")
	// TODO: Implement parameter adjustment

	// Fallback 2: Request manual transcription
	log.Printf("🔄 Fallback 2: Requesting manual transcription...")
	result.Method = "manual"
	result.Error = "Automatic transcription failed. Please type your message manually."
	result.Success = false

	return result
}

// ProcessTextFallback handles text input when audio processing fails
func (ap *AudioProcessor) ProcessTextFallback(text string) *AudioProcessingResult {
	return &AudioProcessingResult{
		Success:       true,
		Transcription: text,
		Method:        "manual",
		RetryCount:    0,
	}
}

// GetUserFriendlyError returns a user-friendly error message
func (ap *AudioProcessor) GetUserFriendlyError(result *AudioProcessingResult) string {
	if result.Success {
		return ""
	}

	switch result.Method {
	case "gemini":
		return "Maaf, gagal memproses audio. Silakan coba lagi atau ketik pesan Anda."
	case "conversion":
		return "Format audio tidak didukung. Silakan gunakan format OGG, MP3, atau WAV."
	case "fallback":
		return "Gagal memproses audio setelah beberapa percobaan. Silakan ketik pesan Anda."
	default:
		return "Terjadi kesalahan. Silakan coba lagi atau ketik pesan Anda."
	}
}

// LogProcessingMetrics logs metrics for monitoring
func (ap *AudioProcessor) LogProcessingMetrics(result *AudioProcessingResult, duration time.Duration) {
	log.Printf("📊 Audio Processing Metrics: success=%v, method=%s, retries=%d, duration=%v",
		result.Success, result.Method, result.RetryCount, duration)
}
