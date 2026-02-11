package integrations

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// WAGatewayClient sends outbound messages via WA Gateway.
type WAGatewayClient struct {
	baseURL string
	apiKey  string
	client  *http.Client
}

type waGatewayMessageRequest struct {
	To      string `json:"to"`
	Message string `json:"message"`
}

func NewWAGatewayClient(baseURL, apiKey string) *WAGatewayClient {
	return &WAGatewayClient{
		baseURL: baseURL,
		apiKey:  apiKey,
		client:  &http.Client{Timeout: 15 * time.Second},
	}
}

// SendMessage sends a plain text WhatsApp message.
func (c *WAGatewayClient) SendMessage(ctx context.Context, to, message string) error {
	if c == nil || c.baseURL == "" {
		return fmt.Errorf("wa gateway not configured")
	}

	payload := waGatewayMessageRequest{To: to, Message: message}
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/internal/send-message", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		req.Header.Set("X-API-Key", c.apiKey)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("wa gateway error: %s", resp.Status)
	}

	return nil
}

type waGatewayImageRequest struct {
	To       string `json:"to"`
	ImageURL string `json:"image_url"`
	Caption  string `json:"caption"`
}

// SendImageFromURL sends a WhatsApp image message by providing an image URL.
// The WA gateway will download the image and send it.
func (c *WAGatewayClient) SendImageFromURL(ctx context.Context, to, imageURL, caption string) error {
	if c == nil || c.baseURL == "" {
		return fmt.Errorf("wa gateway not configured")
	}

	payload := waGatewayImageRequest{To: to, ImageURL: imageURL, Caption: caption}
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/internal/send-image", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		req.Header.Set("X-API-Key", c.apiKey)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("wa gateway send-image error: %s", resp.Status)
	}

	return nil
}
