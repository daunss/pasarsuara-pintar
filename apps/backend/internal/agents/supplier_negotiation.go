package agents

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/pasarsuara/backend/internal/ai"
	"github.com/pasarsuara/backend/internal/database"
)

// QrisPaymentClient provides QRIS payment creation.
type QrisPaymentClient interface {
	CreateQris(ctx context.Context, orderID string, amount float64, customerName, customerPhone string) (string, string, error)
}

// SupplierNegotiationService manages real supplier negotiation via WhatsApp.
type SupplierNegotiationService struct {
	db        *database.SupabaseClient
	waSender  WhatsAppSender
	kolosal   *ai.KolosalClient
	gemini    *ai.GeminiClient
	finance   *FinanceAgent
	inventory *InventoryAgent
	qris      QrisPaymentClient

	mu       sync.Mutex
	sessions map[string]*SupplierNegotiationSession
}

// SupplierNegotiationSession tracks a live negotiation.
type SupplierNegotiationSession struct {
	ID                    string
	BuyerID               string
	BuyerPhone            string
	BuyerName             string
	BuyerCity             string
	ProductName           string
	Unit                  string
	Quantity              float64
	MaxPrice              float64
	Deadline              *time.Time
	Offers                []database.SupplierOffer
	CurrentIndex          int
	AwaitingSupplierPhone string
	CounterSent           bool
	RawText               string
	Status                string
	Messages              []NegotiationMessage
}

func NewSupplierNegotiationService(db *database.SupabaseClient, waSender WhatsAppSender, kolosal *ai.KolosalClient, gemini *ai.GeminiClient, finance *FinanceAgent, inventory *InventoryAgent, qris QrisPaymentClient) *SupplierNegotiationService {
	return &SupplierNegotiationService{
		db:        db,
		waSender:  waSender,
		kolosal:   kolosal,
		gemini:    gemini,
		finance:   finance,
		inventory: inventory,
		qris:      qris,
		sessions:  make(map[string]*SupplierNegotiationSession),
	}
}

func (s *SupplierNegotiationService) Enabled() bool {
	return s != nil && s.db != nil && s.waSender != nil
}

// StartNegotiation sends the first supplier request and returns a message for the buyer.
func (s *SupplierNegotiationService) StartNegotiation(ctx context.Context, buyerPhone, buyerID string, intent *ai.Intent) string {
	if !s.Enabled() {
		return "Fitur negosiasi supplier belum aktif. Coba lagi nanti ya."
	}

	product := getStringEntity(intent.Entities, "product")
	qty := getFloatEntity(intent.Entities, "qty")
	unit := getStringEntity(intent.Entities, "unit")
	maxPrice := getFloatEntity(intent.Entities, "max_price")
	deadline := parseDeadline(intent.Entities["time"])

	if product == "" {
		return "Produk belum disebutkan. Contoh: \"cari beras 25 kg maksimal 12 ribu\""
	}
	if qty == 0 {
		qty = 1
	}
	if unit == "" {
		unit = "unit"
	}

	buyerName, buyerCity := s.getBuyerProfile(ctx, buyerPhone)
	if deadline != nil && time.Now().After(*deadline) {
		return "Maaf, batas waktu pengiriman yang diminta sudah lewat. Coba minta jam lain ya."
	}

	offers, err := s.db.GetSupplierOffers(ctx, buyerID, product, maxPrice, buyerCity)
	if err != nil {
		log.Printf("❌ Failed to load supplier offers: %v", err)
		return "Maaf, gagal mencari supplier saat ini. Coba lagi ya."
	}

	filtered := filterOffersByQty(offers, qty)
	if len(filtered) == 0 {
		return "Belum ada supplier yang cocok untuk permintaan ini."
	}

	session := &SupplierNegotiationSession{
		ID:          fmt.Sprintf("neg-%d", time.Now().UnixMilli()),
		BuyerID:     buyerID,
		BuyerPhone:  buyerPhone,
		BuyerName:   buyerName,
		BuyerCity:   buyerCity,
		ProductName: product,
		Unit:        unit,
		Quantity:    qty,
		MaxPrice:    maxPrice,
		Deadline:    deadline,
		Offers:      filtered,
		Status:      "PENDING",
		RawText:     intent.RawText,
		Messages:    []NegotiationMessage{},
	}

	if deadline != nil {
		deadlineCopy := *deadline
		go s.expireSessionAfter(deadlineCopy, session.ID)
	}

	if err := s.startWithNextSupplier(ctx, session); err != nil {
		log.Printf("❌ Failed to start supplier negotiation: %v", err)
		return "Maaf, belum bisa menghubungi supplier sekarang."
	}

	return fmt.Sprintf("✅ Oke! Saya hubungi supplier terbaik untuk %s %.0f %s. Mohon tunggu ya...", product, qty, unit)
}

func (s *SupplierNegotiationService) IsSupplierMessage(phone string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.sessions[normalizePhone(phone)]
	return ok
}

// HandleSupplierMessage processes supplier replies and sends updates to buyer.
func (s *SupplierNegotiationService) HandleSupplierMessage(ctx context.Context, supplierPhone, message string) (bool, string) {
	if !s.Enabled() {
		return false, ""
	}

	phoneKey := normalizePhone(supplierPhone)
	s.mu.Lock()
	session, ok := s.sessions[phoneKey]
	s.mu.Unlock()
	if !ok || session == nil {
		return false, ""
	}

	if session.Deadline != nil && time.Now().After(*session.Deadline) {
		s.failSession(session, "Waktu negosiasi sudah lewat")
		return true, "Maaf, permintaan sudah expired."
	}

	messageLower := strings.ToLower(message)
	parsed, parseErr := s.parseSupplierReply(ctx, message)
	if parseErr != nil {
		log.Printf("⚠️ Failed to parse supplier reply with Gemini: %v", parseErr)
	}

	if (parseErr == nil && !parsed.Available) || containsAny(messageLower, []string{"habis", "stok kosong", "tidak ada", "ga ada", "tidak tersedia"}) {
		s.notifyBuyer(session, fmt.Sprintf("❌ Supplier %s tidak punya stok %s. Cari supplier lain...", session.Offers[session.CurrentIndex].SupplierName, session.ProductName))
		if err := s.moveToNextSupplier(ctx, session); err != nil {
			s.failSession(session, "Semua supplier tidak tersedia")
		}
		return true, "Baik, terima kasih informasinya."
	}

	price := 0.0
	if parseErr == nil {
		price = parsed.Price
	}
	if price == 0 {
		price = parsePriceFromText(messageLower)
	}
	if price == 0 {
		return true, fmt.Sprintf("Boleh info harga per %s untuk %s?", session.Unit, session.ProductName)
	}

	if session.MaxPrice == 0 || price <= session.MaxPrice {
		return true, s.acceptOffer(ctx, session, price)
	}

	if !session.CounterSent {
		session.CounterSent = true
		counter := session.MaxPrice
		return true, fmt.Sprintf("Bisa Rp %.0f/%s? Saya ambil %.0f %s.", counter, session.Unit, session.Quantity, session.Unit)
	}

	s.notifyBuyer(session, fmt.Sprintf("⚠️ Supplier %s menawarkan Rp %.0f/%s (di atas budget). Cari supplier lain...", session.Offers[session.CurrentIndex].SupplierName, price, session.Unit))
	if err := s.moveToNextSupplier(ctx, session); err != nil {
		s.failSession(session, "Harga semua supplier di atas budget")
	}

	return true, "Terima kasih, saya cek supplier lain dulu ya."
}

func (s *SupplierNegotiationService) acceptOffer(ctx context.Context, session *SupplierNegotiationSession, price float64) string {
	session.Status = "SUCCESS"
	intent := &ai.Intent{
		Action:  "ORDER_RESTOCK",
		RawText: session.RawText,
		Entities: map[string]any{
			"product": session.ProductName,
			"qty":     session.Quantity,
			"unit":    session.Unit,
		},
	}

	var tx *database.Transaction
	if s.finance != nil {
		created, err := s.finance.RecordPurchase(ctx, session.BuyerID, intent, price)
		if err != nil {
			log.Printf("⚠️ Failed to record purchase: %v", err)
		} else {
			tx = created
		}
	}

	if s.inventory != nil {
		if err := s.inventory.UpdateStockAfterPurchase(ctx, session.BuyerID, intent, session.Quantity); err != nil {
			log.Printf("⚠️ Failed to update inventory: %v", err)
		}
	}

	qrMessage := ""
	if tx != nil && s.qris != nil {
		orderID := fmt.Sprintf("NEG-%s", tx.ID)
		qrURL, _, err := s.qris.CreateQris(ctx, orderID, tx.TotalAmount, session.BuyerName, session.BuyerPhone)
		if err != nil {
			log.Printf("⚠️ Failed to create QRIS: %v", err)
		} else {
			qrMessage = fmt.Sprintf("\n\n💳 *QRIS Pembayaran*\nTotal: Rp %.0f\nScan QR: %s", tx.TotalAmount, qrURL)
			if s.db != nil {
				s.updatePaymentRecord(ctx, tx.ID, orderID, session)
			}
		}
	}

	buyerSummary := fmt.Sprintf("🤝 Deal dengan %s!\nProduk: %s\nJumlah: %.0f %s\nHarga: Rp %.0f/%s\nTotal: Rp %.0f%s",
		session.Offers[session.CurrentIndex].SupplierName,
		session.ProductName,
		session.Quantity,
		session.Unit,
		price,
		session.Unit,
		session.Quantity*price,
		qrMessage,
	)
	s.notifyBuyer(session, buyerSummary)

	s.recordNegotiationLog(ctx, session, price)
	s.cleanupSession(session)

	return "Baik, terima kasih. Kami kirim QRIS ke pembeli sekarang."
}

func (s *SupplierNegotiationService) startWithNextSupplier(ctx context.Context, session *SupplierNegotiationSession) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if session.CurrentIndex >= len(session.Offers) {
		return fmt.Errorf("no supplier available")
	}

	offer := session.Offers[session.CurrentIndex]
	session.AwaitingSupplierPhone = normalizePhone(offer.SupplierPhone)
	s.sessions[session.AwaitingSupplierPhone] = session

	message := s.generateSupplierRequestMessage(ctx, session, offer)
	if err := s.waSender.SendMessage(ctx, offer.SupplierPhone, message); err != nil {
		return err
	}

	return nil
}

func (s *SupplierNegotiationService) moveToNextSupplier(ctx context.Context, session *SupplierNegotiationSession) error {
	s.mu.Lock()
	delete(s.sessions, normalizePhone(session.AwaitingSupplierPhone))
	session.CurrentIndex++
	session.CounterSent = false
	s.mu.Unlock()

	if session.CurrentIndex >= len(session.Offers) {
		return fmt.Errorf("no more suppliers")
	}

	return s.startWithNextSupplier(ctx, session)
}

func (s *SupplierNegotiationService) expireSessionAfter(deadline time.Time, sessionID string) {
	for {
		time.Sleep(2 * time.Second)
		if time.Now().After(deadline) {
			break
		}
	}

	s.mu.Lock()
	var target *SupplierNegotiationSession
	for _, session := range s.sessions {
		if session.ID == sessionID {
			target = session
			break
		}
	}
	s.mu.Unlock()

	if target != nil {
		s.failSession(target, "Waktu negosiasi habis")
	}
}

func (s *SupplierNegotiationService) failSession(session *SupplierNegotiationSession, reason string) {
	s.notifyBuyer(session, fmt.Sprintf("⚠️ Negosiasi gagal: %s", reason))
	s.recordNegotiationLog(context.Background(), session, 0)
	s.cleanupSession(session)
}

func (s *SupplierNegotiationService) cleanupSession(session *SupplierNegotiationSession) {
	s.mu.Lock()
	delete(s.sessions, normalizePhone(session.AwaitingSupplierPhone))
	s.mu.Unlock()
}

func (s *SupplierNegotiationService) notifyBuyer(session *SupplierNegotiationSession, message string) {
	if s.waSender == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := s.waSender.SendMessage(ctx, session.BuyerPhone, message); err != nil {
		log.Printf("⚠️ Failed to notify buyer: %v", err)
	}
}

func (s *SupplierNegotiationService) getBuyerProfile(ctx context.Context, phone string) (string, string) {
	if s.db == nil {
		return "", ""
	}

	user, err := s.db.GetUserByPhone(ctx, phone)
	if err == nil && user != nil {
		return user.Name, user.City
	}

	return "", ""
}

func (s *SupplierNegotiationService) recordNegotiationLog(ctx context.Context, session *SupplierNegotiationSession, finalPrice float64) {
	if s.db == nil {
		return
	}

	status := "FAILED"
	if finalPrice > 0 {
		status = "SUCCESS"
	}

	logData := &database.NegotiationLog{
		BuyerID:      session.BuyerID,
		SellerID:     "",
		ProductName:  session.ProductName,
		InitialOffer: session.MaxPrice,
		FinalPrice:   finalPrice,
		Status:       status,
		Transcript:   map[string]any{"messages": session.Messages},
	}

	if err := s.db.CreateNegotiationLog(ctx, logData); err != nil {
		log.Printf("⚠️ Failed to log negotiation: %v", err)
	}
}

func (s *SupplierNegotiationService) updatePaymentRecord(ctx context.Context, transactionID, reference string, session *SupplierNegotiationSession) {
	if s.db == nil {
		return
	}
	payments, err := s.db.GetPaymentsByTransaction(ctx, transactionID)
	if err != nil || len(payments) == 0 {
		return
	}

	notes := ""
	if session != nil {
		noteData := map[string]any{
			"supplier_name":  session.Offers[session.CurrentIndex].SupplierName,
			"supplier_phone": session.Offers[session.CurrentIndex].SupplierPhone,
			"product":        session.ProductName,
			"qty":            session.Quantity,
			"unit":           session.Unit,
			"buyer_phone":    session.BuyerPhone,
		}
		if raw, err := json.Marshal(noteData); err == nil {
			notes = string(raw)
		}
	}
	updates := map[string]any{
		"payment_method":   "QRIS",
		"status":           "PENDING",
		"reference_number": reference,
		"notes":            notes,
	}
	if err := s.db.UpdatePayment(ctx, payments[0].ID, updates); err != nil {
		log.Printf("⚠️ Failed to update payment record: %v", err)
	}
}

func buildSupplierRequestMessage(session *SupplierNegotiationSession, offer database.SupplierOffer) string {
	deadlineText := ""
	if session.Deadline != nil {
		deadlineText = fmt.Sprintf(" Mohon balas sebelum %s.", session.Deadline.Format("15:04"))
	}

	maxPriceText := ""
	if session.MaxPrice > 0 {
		maxPriceText = fmt.Sprintf(" Budget maksimal Rp %.0f/%s.", session.MaxPrice, session.Unit)
	}

	return fmt.Sprintf("Halo %s, ada permintaan %s %.0f %s.%s Apakah tersedia? Bisa berapa harga per %s?%s",
		offer.SupplierName,
		session.ProductName,
		session.Quantity,
		session.Unit,
		maxPriceText,
		session.Unit,
		deadlineText,
	)
}

func (s *SupplierNegotiationService) generateSupplierRequestMessage(ctx context.Context, session *SupplierNegotiationSession, offer database.SupplierOffer) string {
	if s.gemini == nil {
		return buildSupplierRequestMessage(session, offer)
	}

	deadlineText := ""
	if session.Deadline != nil {
		deadlineText = session.Deadline.Format("15:04")
	}

	prompt := fmt.Sprintf(`Tulis pesan WhatsApp singkat, sopan, dan jelas dalam Bahasa Indonesia untuk menanyakan stok dan harga supplier.

Data:
- Nama supplier: %s
- Produk: %s
- Jumlah: %.0f %s
- Budget maksimal: Rp %.0f per %s
- Batas waktu balasan: %s

Aturan:
- Maksimal 2 kalimat.
- Sebutkan nama supplier di awal.
- Minta harga per %s dan konfirmasi stok.
- Jika batas waktu kosong, jangan sebutkan.

Jawab hanya isi pesan tanpa tanda kutip atau tambahan lain.`,
		offer.SupplierName,
		session.ProductName,
		session.Quantity,
		session.Unit,
		session.MaxPrice,
		session.Unit,
		deadlineText,
		session.Unit,
	)

	ctxTimeout, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	text, err := s.gemini.GenerateText(ctxTimeout, prompt)
	if err != nil {
		log.Printf("⚠️ Gemini message generation failed: %v", err)
		return buildSupplierRequestMessage(session, offer)
	}

	clean := strings.TrimSpace(text)
	if clean == "" {
		return buildSupplierRequestMessage(session, offer)
	}

	return clean
}

type supplierReplyParse struct {
	Available bool    `json:"available"`
	Price     float64 `json:"price"`
}

func (s *SupplierNegotiationService) parseSupplierReply(ctx context.Context, message string) (*supplierReplyParse, error) {
	if s.gemini == nil {
		return nil, fmt.Errorf("gemini not configured")
	}

	prompt := fmt.Sprintf(`Kamu membantu parsing balasan supplier dalam chat WhatsApp.
Balasan supplier: "%s"

Ekstrak JSON dengan format:
{"available": true/false, "price": number}

Aturan:
- available = false jika supplier menolak, stok habis, atau tidak tersedia.
- price = harga per unit jika disebutkan, jika tidak ada isi 0.
- Balas hanya JSON valid, tanpa teks tambahan.`, message)

	ctxTimeout, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	text, err := s.gemini.GenerateText(ctxTimeout, prompt)
	if err != nil {
		return nil, err
	}

	text = strings.TrimSpace(text)
	if text == "" {
		return nil, fmt.Errorf("empty response")
	}

	var parsed supplierReplyParse
	if err := json.Unmarshal([]byte(text), &parsed); err != nil {
		return nil, err
	}

	return &parsed, nil
}

func filterOffersByQty(offers []database.SupplierOffer, qty float64) []database.SupplierOffer {
	filtered := make([]database.SupplierOffer, 0, len(offers))
	for _, offer := range offers {
		if offer.MinQty > 0 && qty < offer.MinQty {
			continue
		}
		if offer.MaxQty > 0 && qty > offer.MaxQty {
			continue
		}
		if offer.StockQty > 0 && qty > offer.StockQty {
			continue
		}
		filtered = append(filtered, offer)
	}
	return filtered
}

func parseDeadline(entity any) *time.Time {
	if entity == nil {
		return nil
	}

	var raw string
	switch v := entity.(type) {
	case string:
		raw = v
	default:
		return nil
	}

	raw = strings.ToLower(strings.TrimSpace(raw))
	if raw == "" {
		return nil
	}

	// Extract HH:MM if provided
	if strings.Contains(raw, ":") {
		parts := strings.Split(raw, ":")
		if len(parts) >= 2 {
			hour := toInt(parts[0])
			minute := toInt(parts[1])
			if hour >= 0 {
				deadline := time.Date(time.Now().Year(), time.Now().Month(), time.Now().Day(), hour, minute, 0, 0, time.Now().Location())
				return &deadline
			}
		}
	}

	// Extract hour from text
	re := regexp.MustCompile(`\d{1,2}`)
	match := re.FindString(raw)
	if match != "" {
		hour := toInt(match)
		if hour >= 0 {
			deadline := time.Date(time.Now().Year(), time.Now().Month(), time.Now().Day(), hour, 0, 0, 0, time.Now().Location())
			return &deadline
		}
	}

	return nil
}

func toInt(value string) int {
	value = strings.TrimSpace(value)
	if value == "" {
		return -1
	}
	result := 0
	for i := 0; i < len(value); i++ {
		ch := value[i]
		if ch < '0' || ch > '9' {
			return -1
		}
		result = result*10 + int(ch-'0')
	}
	return result
}

func parsePriceFromText(text string) float64 {
	text = strings.ReplaceAll(text, ",", "")
	text = strings.ReplaceAll(text, ".", "")

	reRibu := regexp.MustCompile(`(\d+)\s*(rb|ribu)`)
	if match := reRibu.FindStringSubmatch(text); len(match) > 1 {
		val := toInt(match[1])
		if val > 0 {
			return float64(val * 1000)
		}
	}

	re := regexp.MustCompile(`\d+`)
	match := re.FindString(text)
	if match == "" {
		return 0
	}

	val := toInt(match)
	if val < 0 {
		return 0
	}
	return float64(val)
}

func normalizePhone(phone string) string {
	phone = strings.TrimSpace(phone)
	phone = strings.TrimPrefix(phone, "+")
	phone = strings.ReplaceAll(phone, " ", "")
	phone = strings.ReplaceAll(phone, "-", "")
	return phone
}

func containsAny(text string, needles []string) bool {
	for _, needle := range needles {
		if strings.Contains(text, needle) {
			return true
		}
	}
	return false
}
