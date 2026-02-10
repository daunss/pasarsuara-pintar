package whatsapp

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sync"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"

	_ "modernc.org/sqlite"
)

type Client struct {
	wa        *whatsmeow.Client
	container *sqlstore.Container
	onMessage func(*events.Message)

	pairingMu        sync.Mutex
	pairingInProgress bool
}

var ErrPairingRequired = errors.New("pairing required")

func NewClient(ctx context.Context, sessionPath string) (*Client, error) {
	// Ensure session directory exists
	if err := os.MkdirAll(sessionPath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create session directory: %w", err)
	}

	dbPath := fmt.Sprintf("%s/store.db", sessionPath)
	dbLog := waLog.Stdout("Database", "ERROR", true)

	container, err := sqlstore.New(ctx, "sqlite", fmt.Sprintf("file:%s?_pragma=foreign_keys(1)", dbPath), dbLog)
	if err != nil {
		return nil, fmt.Errorf("failed to create store: %w", err)
	}

	deviceStore, err := container.GetFirstDevice(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get device: %w", err)
	}

	clientLog := waLog.Stdout("Client", "INFO", true)
	client := whatsmeow.NewClient(deviceStore, clientLog)

	return &Client{
		wa:        client,
		container: container,
	}, nil
}

func (c *Client) SetMessageHandler(handler func(*events.Message)) {
	c.onMessage = handler
}

func (c *Client) HasSession() bool {
	return c.wa != nil && c.wa.Store != nil && c.wa.Store.ID != nil
}

func (c *Client) Connect(ctx context.Context) error {
	// Register event handler
	c.wa.AddEventHandler(c.eventHandler)

	if c.wa.Store.ID == nil {
		return ErrPairingRequired
	}

	if err := c.wa.Connect(); err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}
	fmt.Println("✅ Connected to WhatsApp (existing session)")
	return nil
}

// StartPairing connects and returns a QR code string for manual scanning.
func (c *Client) StartPairing(ctx context.Context) (string, error) {
	c.pairingMu.Lock()
	if c.pairingInProgress {
		c.pairingMu.Unlock()
		return "", fmt.Errorf("pairing already in progress")
	}
	c.pairingInProgress = true
	c.pairingMu.Unlock()
	defer func() {
		c.pairingMu.Lock()
		c.pairingInProgress = false
		c.pairingMu.Unlock()
	}()

	if c.HasSession() {
		if c.wa.IsConnected() {
			return "", fmt.Errorf("already connected")
		}
		if err := c.wa.Connect(); err != nil {
			return "", fmt.Errorf("failed to connect: %w", err)
		}
		return "", fmt.Errorf("session exists; no QR required")
	}

	qrChan, _ := c.wa.GetQRChannel(ctx)
	if err := c.wa.Connect(); err != nil {
		return "", fmt.Errorf("failed to connect: %w", err)
	}

	for {
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		case evt, ok := <-qrChan:
			if !ok {
				return "", fmt.Errorf("qr channel closed")
			}
			if evt.Event == "code" {
				return evt.Code, nil
			}
			if evt.Event == "success" {
				return "", nil
			}
		}
	}
}

func (c *Client) eventHandler(evt interface{}) {
	switch v := evt.(type) {
	case *events.Message:
		if c.onMessage != nil {
			c.onMessage(v)
		}
	}
}

func (c *Client) SendText(ctx context.Context, jid string, text string) error {
	targetJID, err := parseJID(jid)
	if err != nil {
		return err
	}

	_, err = c.wa.SendMessage(ctx, targetJID, &waE2E.Message{
		Conversation: &text,
	})
	return err
}

func (c *Client) Disconnect() {
	c.wa.Disconnect()
}

func (c *Client) IsConnected() bool {
	return c.wa != nil && c.wa.IsConnected()
}

func (c *Client) GetPhoneNumber() string {
	if c.wa == nil || c.wa.Store == nil || c.wa.Store.ID == nil {
		return ""
	}
	return c.wa.Store.ID.User
}
