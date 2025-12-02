package whatsapp

import (
	"context"
	"fmt"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/types"
)

// SendFormattedText sends text with WhatsApp formatting
func (c *Client) SendFormattedText(ctx context.Context, jid string, text string) error {
	targetJID, err := parseJID(jid)
	if err != nil {
		return err
	}

	// WhatsApp formatting:
	// *bold* _italic_ ~strikethrough~ ```monospace```

	_, err = c.wa.SendMessage(ctx, targetJID, &waE2E.Message{
		Conversation: &text,
	})
	return err
}

// SendButtonMessage sends message with buttons (Quick Reply)
func (c *Client) SendButtonMessage(ctx context.Context, jid string, text string, buttons []string) error {
	targetJID, err := parseJID(jid)
	if err != nil {
		return err
	}

	// Create button messages
	var buttonMessages []*waE2E.ButtonsMessage_Button
	for i, btnText := range buttons {
		btnID := fmt.Sprintf("btn_%d", i)
		btnTextCopy := btnText
		buttonMessages = append(buttonMessages, &waE2E.ButtonsMessage_Button{
			ButtonID: &btnID,
			ButtonText: &waE2E.ButtonsMessage_Button_ButtonText{
				DisplayText: &btnTextCopy,
			},
			Type: waE2E.ButtonsMessage_Button_RESPONSE.Enum(),
		})
	}

	_, err = c.wa.SendMessage(ctx, targetJID, &waE2E.Message{
		ButtonsMessage: &waE2E.ButtonsMessage{
			ContentText: &text,
			Buttons:     buttonMessages,
		},
	})
	return err
}

// SendListMessage sends message with list menu
func (c *Client) SendListMessage(ctx context.Context, jid string, title, description, buttonText string, sections []ListSection) error {
	targetJID, err := parseJID(jid)
	if err != nil {
		return err
	}

	var listSections []*waE2E.ListMessage_Section
	for _, section := range sections {
		var rows []*waE2E.ListMessage_Row
		for i, item := range section.Items {
			rowID := fmt.Sprintf("row_%d", i)
			rows = append(rows, &waE2E.ListMessage_Row{
				RowID:       &rowID,
				Title:       &item.Title,
				Description: &item.Description,
			})
		}
		listSections = append(listSections, &waE2E.ListMessage_Section{
			Title: &section.Title,
			Rows:  rows,
		})
	}

	_, err = c.wa.SendMessage(ctx, targetJID, &waE2E.Message{
		ListMessage: &waE2E.ListMessage{
			Title:       &title,
			Description: &description,
			ButtonText:  &buttonText,
			ListType:    waE2E.ListMessage_SINGLE_SELECT.Enum(),
			Sections:    listSections,
		},
	})
	return err
}

// ListSection represents a section in list message
type ListSection struct {
	Title string
	Items []ListItem
}

// ListItem represents an item in list
type ListItem struct {
	ID          string
	Title       string
	Description string
}

// SendImage sends an image with optional caption
func (c *Client) SendImage(ctx context.Context, jid string, imageData []byte, caption string) error {
	targetJID, err := parseJID(jid)
	if err != nil {
		return err
	}

	// Upload image to WhatsApp servers
	uploaded, err := c.wa.Upload(ctx, imageData, whatsmeow.MediaImage)
	if err != nil {
		return fmt.Errorf("failed to upload image: %w", err)
	}

	imageMsg := &waE2E.ImageMessage{
		URL:           &uploaded.URL,
		DirectPath:    &uploaded.DirectPath,
		MediaKey:      uploaded.MediaKey,
		Mimetype:      stringPtr("image/jpeg"),
		FileEncSHA256: uploaded.FileEncSHA256,
		FileSHA256:    uploaded.FileSHA256,
		FileLength:    &uploaded.FileLength,
	}

	if caption != "" {
		imageMsg.Caption = &caption
	}

	_, err = c.wa.SendMessage(ctx, targetJID, &waE2E.Message{
		ImageMessage: imageMsg,
	})
	return err
}

// SendDocument sends a document file
func (c *Client) SendDocument(ctx context.Context, jid string, docData []byte, filename, mimetype string) error {
	targetJID, err := parseJID(jid)
	if err != nil {
		return err
	}

	// Upload document to WhatsApp servers
	uploaded, err := c.wa.Upload(ctx, docData, whatsmeow.MediaDocument)
	if err != nil {
		return fmt.Errorf("failed to upload document: %w", err)
	}

	_, err = c.wa.SendMessage(ctx, targetJID, &waE2E.Message{
		DocumentMessage: &waE2E.DocumentMessage{
			URL:           &uploaded.URL,
			DirectPath:    &uploaded.DirectPath,
			MediaKey:      uploaded.MediaKey,
			Mimetype:      &mimetype,
			FileEncSHA256: uploaded.FileEncSHA256,
			FileSHA256:    uploaded.FileSHA256,
			FileLength:    &uploaded.FileLength,
			FileName:      &filename,
		},
	})
	return err
}

// SendTyping sends typing indicator
func (c *Client) SendTyping(ctx context.Context, jid string, isTyping bool) error {
	targetJID, err := parseJID(jid)
	if err != nil {
		return err
	}

	state := types.ChatPresenceComposing
	if !isTyping {
		state = types.ChatPresencePaused
	}

	return c.wa.SendChatPresence(ctx, targetJID, state, types.ChatPresenceMediaText)
}

// Helper function
func stringPtr(s string) *string {
	return &s
}
