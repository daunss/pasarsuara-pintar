package whatsapp

import (
	"context"
	"fmt"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
)

// DownloadAudio downloads audio message from WhatsApp
func (c *Client) DownloadAudio(ctx context.Context, msg *waE2E.Message) ([]byte, error) {
	if msg.AudioMessage == nil {
		return nil, fmt.Errorf("not an audio message")
	}

	audioMsg := msg.AudioMessage

	// Download the audio file
	data, err := c.wa.Download(ctx, audioMsg)
	if err != nil {
		return nil, fmt.Errorf("failed to download audio: %w", err)
	}

	return data, nil
}

// DownloadImage downloads image message from WhatsApp
func (c *Client) DownloadImage(ctx context.Context, msg *waE2E.Message) ([]byte, error) {
	if msg.ImageMessage == nil {
		return nil, fmt.Errorf("not an image message")
	}

	imageMsg := msg.ImageMessage

	// Download the image file
	data, err := c.wa.Download(ctx, imageMsg)
	if err != nil {
		return nil, fmt.Errorf("failed to download image: %w", err)
	}

	return data, nil
}

// DownloadDocument downloads document message from WhatsApp
func (c *Client) DownloadDocument(ctx context.Context, msg *waE2E.Message) ([]byte, string, error) {
	if msg.DocumentMessage == nil {
		return nil, "", fmt.Errorf("not a document message")
	}

	docMsg := msg.DocumentMessage

	// Download the document file
	data, err := c.wa.Download(ctx, docMsg)
	if err != nil {
		return nil, "", fmt.Errorf("failed to download document: %w", err)
	}

	filename := "document"
	if docMsg.FileName != nil {
		filename = *docMsg.FileName
	}

	return data, filename, nil
}

// DownloadVideo downloads video message from WhatsApp
func (c *Client) DownloadVideo(ctx context.Context, msg *waE2E.Message) ([]byte, error) {
	if msg.VideoMessage == nil {
		return nil, fmt.Errorf("not a video message")
	}

	videoMsg := msg.VideoMessage

	// Download the video file
	data, err := c.wa.Download(ctx, videoMsg)
	if err != nil {
		return nil, fmt.Errorf("failed to download video: %w", err)
	}

	return data, nil
}

// GetClient returns the underlying whatsmeow client for advanced operations
func (c *Client) GetClient() *whatsmeow.Client {
	return c.wa
}
