package context

import (
	"sync"
	"time"
)

// ConversationMessage represents a single message in conversation
type ConversationMessage struct {
	Role      string    `json:"role"`      // user, assistant, system
	Content   string    `json:"content"`   // message content
	Intent    string    `json:"intent"`    // extracted intent
	Timestamp time.Time `json:"timestamp"` // when message was sent
}

// ConversationContext stores conversation history per user
type ConversationContext struct {
	UserID       string                 `json:"user_id"`
	Messages     []ConversationMessage  `json:"messages"`
	LastIntent   string                 `json:"last_intent"`
	LastEntities map[string]interface{} `json:"last_entities"`
	LastUpdate   time.Time              `json:"last_update"`
	SessionStart time.Time              `json:"session_start"`
}

// ConversationManager manages conversation contexts for all users
type ConversationManager struct {
	contexts map[string]*ConversationContext
	mu       sync.RWMutex
	ttl      time.Duration // Time to live for inactive sessions
}

// NewConversationManager creates a new conversation manager
func NewConversationManager(ttl time.Duration) *ConversationManager {
	if ttl == 0 {
		ttl = 30 * time.Minute // Default 30 minutes
	}

	cm := &ConversationManager{
		contexts: make(map[string]*ConversationContext),
		ttl:      ttl,
	}

	// Start cleanup goroutine
	go cm.cleanupExpiredSessions()

	return cm
}

// GetContext retrieves or creates conversation context for a user
func (cm *ConversationManager) GetContext(userID string) *ConversationContext {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	ctx, exists := cm.contexts[userID]
	if !exists {
		ctx = &ConversationContext{
			UserID:       userID,
			Messages:     []ConversationMessage{},
			LastEntities: make(map[string]interface{}),
			SessionStart: time.Now(),
			LastUpdate:   time.Now(),
		}
		cm.contexts[userID] = ctx
	}

	return ctx
}

// AddMessage adds a message to conversation history
func (cm *ConversationManager) AddMessage(userID, role, content, intent string, entities map[string]interface{}) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	ctx := cm.contexts[userID]
	if ctx == nil {
		ctx = &ConversationContext{
			UserID:       userID,
			Messages:     []ConversationMessage{},
			LastEntities: make(map[string]interface{}),
			SessionStart: time.Now(),
		}
		cm.contexts[userID] = ctx
	}

	msg := ConversationMessage{
		Role:      role,
		Content:   content,
		Intent:    intent,
		Timestamp: time.Now(),
	}

	ctx.Messages = append(ctx.Messages, msg)
	ctx.LastUpdate = time.Now()

	// Update last intent and entities
	if intent != "" {
		ctx.LastIntent = intent
	}
	if entities != nil {
		ctx.LastEntities = entities
	}

	// Keep only last 20 messages to avoid memory bloat
	if len(ctx.Messages) > 20 {
		ctx.Messages = ctx.Messages[len(ctx.Messages)-20:]
	}
}

// GetRecentMessages returns recent messages for context
func (cm *ConversationManager) GetRecentMessages(userID string, count int) []ConversationMessage {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	ctx, exists := cm.contexts[userID]
	if !exists || len(ctx.Messages) == 0 {
		return []ConversationMessage{}
	}

	if count > len(ctx.Messages) {
		count = len(ctx.Messages)
	}

	return ctx.Messages[len(ctx.Messages)-count:]
}

// GetLastIntent returns the last intent from conversation
func (cm *ConversationManager) GetLastIntent(userID string) string {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	ctx, exists := cm.contexts[userID]
	if !exists {
		return ""
	}

	return ctx.LastIntent
}

// GetLastEntities returns the last entities from conversation
func (cm *ConversationManager) GetLastEntities(userID string) map[string]interface{} {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	ctx, exists := cm.contexts[userID]
	if !exists {
		return make(map[string]interface{})
	}

	return ctx.LastEntities
}

// ClearContext clears conversation context for a user
func (cm *ConversationManager) ClearContext(userID string) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	delete(cm.contexts, userID)
}

// cleanupExpiredSessions removes inactive sessions
func (cm *ConversationManager) cleanupExpiredSessions() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		cm.mu.Lock()
		now := time.Now()
		for userID, ctx := range cm.contexts {
			if now.Sub(ctx.LastUpdate) > cm.ttl {
				delete(cm.contexts, userID)
			}
		}
		cm.mu.Unlock()
	}
}

// GetContextSummary returns a summary of conversation for AI
func (cm *ConversationManager) GetContextSummary(userID string) string {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	ctx, exists := cm.contexts[userID]
	if !exists || len(ctx.Messages) == 0 {
		return ""
	}

	summary := "Previous conversation:\n"
	recentCount := 5
	if len(ctx.Messages) < recentCount {
		recentCount = len(ctx.Messages)
	}

	recentMessages := ctx.Messages[len(ctx.Messages)-recentCount:]
	for _, msg := range recentMessages {
		summary += msg.Role + ": " + msg.Content + "\n"
	}

	if ctx.LastIntent != "" {
		summary += "\nLast intent: " + ctx.LastIntent
	}

	return summary
}
