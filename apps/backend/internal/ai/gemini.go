package ai

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// GeminiClient handles Speech-to-Text using Gemini API
type GeminiClient struct {
	apiKey     string
	httpClient *http.Client
}

type GeminiRequest struct {
	Contents []GeminiContent `json:"contents"`
}

type GeminiContent struct {
	Parts []GeminiPart `json:"parts"`
}

type GeminiPart struct {
	Text       string        `json:"text,omitempty"`
	InlineData *GeminiInline `json:"inline_data,omitempty"`
}

type GeminiInline struct {
	MimeType string `json:"mime_type"`
	Data     string `json:"data"` // base64 encoded
}

type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	Error *GeminiError `json:"error,omitempty"`
}

type GeminiError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

func NewGeminiClient(apiKey string) *GeminiClient {
	return &GeminiClient{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// TranscribeAudio converts audio to text using Gemini
func (g *GeminiClient) TranscribeAudio(ctx context.Context, audioData []byte, mimeType string) (string, error) {
	if g.apiKey == "" {
		return "", fmt.Errorf("Gemini API key not configured")
	}

	// Encode audio to base64
	audioBase64 := base64.StdEncoding.EncodeToString(audioData)

	// Build request
	req := GeminiRequest{
		Contents: []GeminiContent{
			{
				Parts: []GeminiPart{
					{
						Text: "Transcribe this audio to text. The audio may contain Indonesian, Javanese, or Sundanese language. Return only the transcription, nothing else.",
					},
					{
						InlineData: &GeminiInline{
							MimeType: mimeType,
							Data:     audioBase64,
						},
					},
				},
			},
		},
	}

	jsonData, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	// Call Gemini API
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=%s", g.apiKey)

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := g.httpClient.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("failed to call Gemini API: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	var geminiResp GeminiResponse
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if geminiResp.Error != nil {
		return "", fmt.Errorf("Gemini API error: %s", geminiResp.Error.Message)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no transcription returned")
	}

	return geminiResp.Candidates[0].Content.Parts[0].Text, nil
}
