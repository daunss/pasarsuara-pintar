package whatsapp

import (
	"fmt"
	"strings"

	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/types"
)

// parseJID converts phone number string to JID
func parseJID(phone string) (types.JID, error) {
	// Remove any non-numeric characters except @
	if strings.Contains(phone, "@") {
		return types.ParseJID(phone)
	}

	// Clean phone number
	phone = strings.ReplaceAll(phone, "+", "")
	phone = strings.ReplaceAll(phone, "-", "")
	phone = strings.ReplaceAll(phone, " ", "")

	return types.NewJID(phone, types.DefaultUserServer), nil
}

// ExtractTextFromMessage extracts text content from various message types
func ExtractTextFromMessage(msg *waE2E.Message) string {
	if msg == nil {
		return ""
	}

	// Regular text message
	if msg.Conversation != nil {
		return *msg.Conversation
	}

	// Extended text message (with preview, etc)
	if msg.ExtendedTextMessage != nil && msg.ExtendedTextMessage.Text != nil {
		return *msg.ExtendedTextMessage.Text
	}

	// Image with caption
	if msg.ImageMessage != nil && msg.ImageMessage.Caption != nil {
		return *msg.ImageMessage.Caption
	}

	// Video with caption
	if msg.VideoMessage != nil && msg.VideoMessage.Caption != nil {
		return *msg.VideoMessage.Caption
	}

	// Document with caption
	if msg.DocumentMessage != nil && msg.DocumentMessage.Caption != nil {
		return *msg.DocumentMessage.Caption
	}

	return ""
}

// IsAudioMessage checks if message contains audio/voice note
func IsAudioMessage(msg *waE2E.Message) bool {
	if msg == nil {
		return false
	}
	return msg.AudioMessage != nil
}

// GetAudioInfo returns audio message details
func GetAudioInfo(msg *waE2E.Message) (mimetype string, seconds uint32, ptt bool) {
	if msg.AudioMessage == nil {
		return "", 0, false
	}

	audio := msg.AudioMessage
	if audio.Mimetype != nil {
		mimetype = *audio.Mimetype
	}
	if audio.Seconds != nil {
		seconds = *audio.Seconds
	}
	if audio.PTT != nil {
		ptt = *audio.PTT // PTT = Push To Talk (voice note)
	}

	return mimetype, seconds, ptt
}

// FormatPhoneNumber formats JID to readable phone number
func FormatPhoneNumber(jid types.JID) string {
	return fmt.Sprintf("+%s", jid.User)
}
