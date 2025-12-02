package agents

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/pasarsuara/backend/internal/database"
)

// NotificationAgent handles notification queue and delivery
type NotificationAgent struct {
	db *database.SupabaseClient
}

func NewNotificationAgent(db *database.SupabaseClient) *NotificationAgent {
	return &NotificationAgent{db: db}
}

// QueueNotification adds a notification to the queue
func (n *NotificationAgent) QueueNotification(ctx context.Context, userID, notifType, title, message, channel string) error {
	if n.db == nil {
		return fmt.Errorf("database not configured")
	}

	notif := &database.NotificationQueue{
		UserID:      userID,
		Type:        notifType,
		Title:       title,
		Message:     message,
		Channel:     channel,
		Status:      "PENDING",
		ScheduledAt: time.Now().Format(time.RFC3339),
	}

	err := n.db.CreateNotification(ctx, notif)
	if err != nil {
		log.Printf("❌ Failed to queue notification: %v", err)
		return err
	}

	log.Printf("✅ Notification queued: %s - %s", notifType, title)
	return nil
}

// QueueLowStockAlert queues a low stock alert notification
func (n *NotificationAgent) QueueLowStockAlert(ctx context.Context, userID, productName string, currentStock, threshold float64) error {
	title := "⚠️ Stok Menipis"
	message := fmt.Sprintf("Stok %s tinggal %.0f (batas: %.0f). Segera restock!", productName, currentStock, threshold)

	return n.QueueNotification(ctx, userID, "LOW_STOCK", title, message, "whatsapp")
}

// QueueDailyReport queues a daily report notification
func (n *NotificationAgent) QueueDailyReport(ctx context.Context, userID string, scheduledTime time.Time) error {
	title := "📊 Laporan Harian"
	message := "Laporan penjualan hari ini sudah siap. Ketik 'laporan hari ini' untuk melihat."

	notif := &database.NotificationQueue{
		UserID:      userID,
		Type:        "DAILY_REPORT",
		Title:       title,
		Message:     message,
		Channel:     "whatsapp",
		Status:      "PENDING",
		ScheduledAt: scheduledTime.Format(time.RFC3339),
	}

	if n.db == nil {
		return fmt.Errorf("database not configured")
	}

	err := n.db.CreateNotification(ctx, notif)
	if err != nil {
		log.Printf("❌ Failed to queue daily report: %v", err)
		return err
	}

	log.Printf("✅ Daily report scheduled for: %s", scheduledTime.Format("15:04"))
	return nil
}

// GetPendingNotifications gets notifications ready to be sent
func (n *NotificationAgent) GetPendingNotifications(ctx context.Context, limit int) ([]database.NotificationQueue, error) {
	if n.db == nil {
		return nil, fmt.Errorf("database not configured")
	}

	notifs, err := n.db.GetPendingNotifications(ctx, limit)
	if err != nil {
		log.Printf("❌ Failed to get pending notifications: %v", err)
		return nil, err
	}

	return notifs, nil
}

// MarkAsSent marks a notification as sent
func (n *NotificationAgent) MarkAsSent(ctx context.Context, notifID string) error {
	if n.db == nil {
		return fmt.Errorf("database not configured")
	}

	updates := map[string]any{
		"status":  "SENT",
		"sent_at": time.Now().Format(time.RFC3339),
	}

	err := n.db.UpdateNotification(ctx, notifID, updates)
	if err != nil {
		log.Printf("❌ Failed to mark notification as sent: %v", err)
		return err
	}

	log.Printf("✅ Notification marked as sent: %s", notifID)
	return nil
}

// MarkAsFailed marks a notification as failed
func (n *NotificationAgent) MarkAsFailed(ctx context.Context, notifID, errorMsg string) error {
	if n.db == nil {
		return fmt.Errorf("database not configured")
	}

	updates := map[string]any{
		"status":        "FAILED",
		"error_message": errorMsg,
		"retry_count":   1, // Should increment existing count
	}

	err := n.db.UpdateNotification(ctx, notifID, updates)
	if err != nil {
		log.Printf("❌ Failed to mark notification as failed: %v", err)
		return err
	}

	log.Printf("⚠️ Notification marked as failed: %s - %s", notifID, errorMsg)
	return nil
}

// ProcessNotificationQueue processes pending notifications
// This should be called periodically (e.g., every minute)
func (n *NotificationAgent) ProcessNotificationQueue(ctx context.Context, sendFunc func(userID, message string) error) error {
	notifs, err := n.GetPendingNotifications(ctx, 10)
	if err != nil {
		return err
	}

	if len(notifs) == 0 {
		return nil
	}

	log.Printf("📬 Processing %d pending notifications", len(notifs))

	for _, notif := range notifs {
		// Check if scheduled time has passed
		scheduledTime, err := time.Parse(time.RFC3339, notif.ScheduledAt)
		if err != nil || time.Now().Before(scheduledTime) {
			continue
		}

		// Format message
		fullMessage := fmt.Sprintf("*%s*\n\n%s", notif.Title, notif.Message)

		// Send notification
		err = sendFunc(notif.UserID, fullMessage)
		if err != nil {
			n.MarkAsFailed(ctx, notif.ID, err.Error())
			continue
		}

		// Mark as sent
		n.MarkAsSent(ctx, notif.ID)
	}

	return nil
}
