package whatsapp

import (
	"context"
	"fmt"
	"os"

	"github.com/mdp/qrterminal/v3"
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
}

func NewClient(ctx context.Context, sessionPath string) (*Client, error) {
	// Ensure session directory exists
	if err := os.MkdirAll(sessionPath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create session directory: %w", err)
	}

	dbPath := fmt.Sprintf("%s/store.db", sessionPath)
	dbLog := waLog.Stdout("Database", "ERROR", true)

	container, err := sqlstore.New(ctx, "sqlite", fmt.Sprintf("file:%s?_foreign_keys=on", dbPath), dbLog)
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

func (c *Client) Connect(ctx context.Context) error {
	// Register event handler
	c.wa.AddEventHandler(c.eventHandler)

	if c.wa.Store.ID == nil {
		// No session, need to pair with QR code
		qrChan, _ := c.wa.GetQRChannel(ctx)
		err := c.wa.Connect()
		if err != nil {
			return fmt.Errorf("failed to connect: %w", err)
		}

		for evt := range qrChan {
			if evt.Event == "code" {
				fmt.Println("\n📱 Scan QR Code ini dengan WhatsApp:")
				qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, os.Stdout)
				fmt.Println("")
			} else {
				fmt.Println("Login event:", evt.Event)
			}
		}
	} else {
		// Already logged in
		err := c.wa.Connect()
		if err != nil {
			return fmt.Errorf("failed to connect: %w", err)
		}
		fmt.Println("✅ Connected to WhatsApp (existing session)")
	}

	return nil
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
