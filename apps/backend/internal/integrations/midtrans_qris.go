package integrations

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// MidtransClient handles QRIS payment creation via Midtrans Charge API.
type MidtransClient struct {
	serverKey  string
	baseURL    string
	httpClient *http.Client
}

type midtransChargeRequest struct {
	PaymentType        string                     `json:"payment_type"`
	TransactionDetails midtransTransactionDetails `json:"transaction_details"`
	CustomerDetails    *midtransCustomerDetails   `json:"customer_details,omitempty"`
	Qris               map[string]string          `json:"qris,omitempty"`
}

type midtransTransactionDetails struct {
	OrderID     string `json:"order_id"`
	GrossAmount int64  `json:"gross_amount"`
}

type midtransCustomerDetails struct {
	FirstName string `json:"first_name,omitempty"`
	Phone     string `json:"phone,omitempty"`
}

type midtransChargeResponse struct {
	TransactionID string `json:"transaction_id"`
	OrderID       string `json:"order_id"`
	StatusCode    string `json:"status_code"`
	StatusMessage string `json:"status_message"`
	Actions       []struct {
		Name string `json:"name"`
		URL  string `json:"url"`
	} `json:"actions"`
}

func NewMidtransClient(serverKey string, isProduction bool) *MidtransClient {
	baseURL := "https://api.sandbox.midtrans.com"
	if isProduction {
		baseURL = "https://api.midtrans.com"
	}

	return &MidtransClient{
		serverKey:  serverKey,
		baseURL:    baseURL,
		httpClient: &http.Client{Timeout: 20 * time.Second},
	}
}

// CreateQris creates a QRIS payment and returns the QR URL and transaction ID.
func (c *MidtransClient) CreateQris(ctx context.Context, orderID string, amount float64, customerName, customerPhone string) (string, string, error) {
	if c == nil || c.serverKey == "" {
		return "", "", fmt.Errorf("midtrans server key not configured")
	}

	if amount <= 0 {
		return "", "", fmt.Errorf("invalid amount")
	}

	reqBody := midtransChargeRequest{
		PaymentType: "qris",
		TransactionDetails: midtransTransactionDetails{
			OrderID:     orderID,
			GrossAmount: int64(amount),
		},
		CustomerDetails: &midtransCustomerDetails{
			FirstName: customerName,
			Phone:     customerPhone,
		},
		Qris: map[string]string{
			"acquirer": "gopay",
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/v2/charge", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", "", err
	}

	auth := base64.StdEncoding.EncodeToString([]byte(c.serverKey + ":"))
	req.Header.Set("Authorization", "Basic "+auth)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	var chargeResp midtransChargeResponse
	if err := json.NewDecoder(resp.Body).Decode(&chargeResp); err != nil {
		return "", "", err
	}

	if resp.StatusCode >= 400 {
		return "", "", fmt.Errorf("midtrans error: %s", chargeResp.StatusMessage)
	}

	qrURL := ""
	for _, action := range chargeResp.Actions {
		if strings.Contains(strings.ToLower(action.Name), "qr") || strings.Contains(strings.ToLower(action.URL), "qr") {
			qrURL = action.URL
			break
		}
	}

	if qrURL == "" {
		return "", chargeResp.TransactionID, fmt.Errorf("midtrans did not return QR URL")
	}

	return qrURL, chargeResp.TransactionID, nil
}
