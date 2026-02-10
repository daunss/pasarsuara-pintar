package agents

import "context"

// WhatsAppSender defines the interface for outbound WhatsApp messages.
type WhatsAppSender interface {
	SendMessage(ctx context.Context, to, message string) error
}
