package api

import (
	"context"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/pasarsuara/backend/internal/database"
)

// MidtransWebhook handles payment notifications from Midtrans
type MidtransWebhook struct {
	db       *database.SupabaseClient
	waSender WhatsAppSender
}

// WhatsAppSender allows sending outbound WhatsApp messages.
type WhatsAppSender interface {
	SendMessage(ctx context.Context, to, message string) error
}

// MidtransNotification represents the webhook payload from Midtrans
type MidtransNotification struct {
	TransactionTime   string `json:"transaction_time"`
	TransactionStatus string `json:"transaction_status"`
	TransactionID     string `json:"transaction_id"`
	StatusMessage     string `json:"status_message"`
	StatusCode        string `json:"status_code"`
	SignatureKey      string `json:"signature_key"`
	PaymentType       string `json:"payment_type"`
	OrderID           string `json:"order_id"`
	MerchantID        string `json:"merchant_id"`
	GrossAmount       string `json:"gross_amount"`
	FraudStatus       string `json:"fraud_status"`
	Currency          string `json:"currency"`
}

func NewMidtransWebhook(db *database.SupabaseClient, waSender WhatsAppSender) *MidtransWebhook {
	return &MidtransWebhook{
		db:       db,
		waSender: waSender,
	}
}

func (m *MidtransWebhook) Handle(rw http.ResponseWriter, r *http.Request) {
	var notification MidtransNotification

	if err := json.NewDecoder(r.Body).Decode(&notification); err != nil {
		log.Printf("❌ Failed to decode Midtrans notification: %v", err)
		http.Error(rw, "Invalid payload", http.StatusBadRequest)
		return
	}

	log.Printf("💳 Midtrans Webhook received for Order: %s, Status: %s",
		notification.OrderID, notification.TransactionStatus)

	// Verify signature
	if !m.verifySignature(notification) {
		log.Printf("❌ Invalid signature for order: %s", notification.OrderID)
		http.Error(rw, "Invalid signature", http.StatusForbidden)
		return
	}

	// Process payment based on transaction status
	ctx := context.Background()
	if err := m.processPayment(ctx, notification); err != nil {
		log.Printf("❌ Failed to process payment: %v", err)
		http.Error(rw, "Failed to process payment", http.StatusInternalServerError)
		return
	}

	// Send success response
	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(map[string]interface{}{
		"success": true,
		"message": "Payment notification processed",
	})
}

func (m *MidtransWebhook) verifySignature(notification MidtransNotification) bool {
	serverKey := os.Getenv("MIDTRANS_SERVER_KEY")
	if serverKey == "" {
		log.Println("⚠️ MIDTRANS_SERVER_KEY not set, skipping signature verification")
		return true // Skip verification in development
	}

	// Create signature: SHA512(order_id+status_code+gross_amount+server_key)
	signatureString := notification.OrderID + notification.StatusCode +
		notification.GrossAmount + serverKey

	hash := sha512.New()
	hash.Write([]byte(signatureString))
	calculatedSignature := hex.EncodeToString(hash.Sum(nil))

	return calculatedSignature == notification.SignatureKey
}

func (m *MidtransWebhook) processPayment(ctx context.Context, notification MidtransNotification) error {
	// Get order by order_number
	orders, err := m.db.GetOrdersByNumber(ctx, notification.OrderID)
	if err == nil && len(orders) > 0 {
		order := orders[0]

		// Determine payment status based on transaction status
		var paymentStatus string
		var orderStatus string

		switch notification.TransactionStatus {
		case "capture", "settlement":
			if notification.FraudStatus == "accept" || notification.FraudStatus == "" {
				paymentStatus = "PAID"
				orderStatus = "CONFIRMED"
			} else {
				paymentStatus = "FAILED"
				orderStatus = "CANCELLED"
			}
		case "pending":
			paymentStatus = "PENDING"
			orderStatus = "PENDING"
		case "deny", "expire", "cancel":
			paymentStatus = "FAILED"
			orderStatus = "CANCELLED"
		default:
			paymentStatus = "PENDING"
			orderStatus = "PENDING"
		}

		// Update order
		now := time.Now()
		updates := map[string]interface{}{
			"payment_status": paymentStatus,
			"payment_method": notification.PaymentType,
			"status":         orderStatus,
			"updated_at":     now,
		}

		if paymentStatus == "PAID" {
			updates["paid_at"] = now
		}

		if err := m.db.UpdateOrder(ctx, order.ID, updates); err != nil {
			return fmt.Errorf("failed to update order: %w", err)
		}

		log.Printf("✅ Order %s updated: payment_status=%s, order_status=%s",
			notification.OrderID, paymentStatus, orderStatus)

		// Create delivery if payment is successful
		if paymentStatus == "PAID" {
			if err := m.createDelivery(ctx, order); err != nil {
				log.Printf("⚠️ Failed to create delivery: %v", err)
				// Don't fail the webhook, just log the error
			}
		}

		return nil
	}

	// Fallback: update payment records by reference number (QRIS/negotiation flow)
	payment, err := m.db.GetPaymentByReference(ctx, notification.OrderID)
	if err != nil || payment == nil {
		return fmt.Errorf("order or payment not found: %s", notification.OrderID)
	}

	paymentStatus := "PENDING"
	switch notification.TransactionStatus {
	case "capture", "settlement":
		if notification.FraudStatus == "accept" || notification.FraudStatus == "" {
			paymentStatus = "PAID"
		} else {
			paymentStatus = "FAILED"
		}
	case "pending":
		paymentStatus = "PENDING"
	case "deny", "expire", "cancel":
		paymentStatus = "FAILED"
	}

	updates := map[string]interface{}{
		"payment_method":   notification.PaymentType,
		"status":           paymentStatus,
		"reference_number": notification.OrderID,
	}
	if paymentStatus == "PAID" {
		updates["paid_at"] = time.Now().Format(time.RFC3339)
	}

	if err := m.db.UpdatePayment(ctx, payment.ID, updates); err != nil {
		return fmt.Errorf("failed to update payment: %w", err)
	}

	log.Printf("✅ Payment %s updated: status=%s", payment.ID, paymentStatus)

	if paymentStatus == "PAID" {
		m.notifySupplier(ctx, payment)
	}
	return nil
}

func (m *MidtransWebhook) notifySupplier(ctx context.Context, payment *database.Payment) {
	if m.waSender == nil || payment == nil || payment.Notes == "" {
		return
	}

	var noteData map[string]any
	if err := json.Unmarshal([]byte(payment.Notes), &noteData); err != nil {
		return
	}

	phone, _ := noteData["supplier_phone"].(string)
	if phone == "" {
		return
	}

	product, _ := noteData["product"].(string)
	unit, _ := noteData["unit"].(string)
	qty := noteData["qty"]
	qtyText := ""
	if qtyFloat, ok := qty.(float64); ok && qtyFloat > 0 {
		qtyText = fmt.Sprintf("%.0f %s", qtyFloat, unit)
	}

	message := "✅ Pembayaran QRIS sudah diterima. Silakan proses pesanan sekarang."
	if product != "" && qtyText != "" {
		message = fmt.Sprintf("✅ Pembayaran QRIS sudah diterima untuk %s (%s). Silakan proses pesanan sekarang.", product, qtyText)
	}

	ctxTimeout, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := m.waSender.SendMessage(ctxTimeout, phone, message); err != nil {
		log.Printf("⚠️ Failed to notify supplier: %v", err)
	}
}

func (m *MidtransWebhook) createDelivery(ctx context.Context, order database.Order) error {
	// Generate tracking number
	trackingNumber := fmt.Sprintf("TRK-%d", time.Now().UnixMilli())

	delivery := &database.Delivery{
		OrderID:           order.ID,
		TrackingNumber:    trackingNumber,
		Status:            "PENDING",
		DeliveryAddress:   order.DeliveryAddress,
		RecipientName:     "Customer",    // TODO: Get from order
		RecipientPhone:    "08123456789", // TODO: Get from order
		DeliveryFee:       order.DeliveryFee,
		EstimatedDelivery: time.Now().Add(3 * 24 * time.Hour), // 3 days
	}

	if err := m.db.CreateDelivery(ctx, delivery); err != nil {
		return err
	}

	log.Printf("✅ Delivery created for order %s: tracking=%s", order.OrderNumber, trackingNumber)
	return nil
}
