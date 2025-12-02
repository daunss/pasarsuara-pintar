# Phase 3 API Reference

Quick reference untuk menggunakan Phase 3 features.

## CatalogAgent

```go
catalogAgent := NewCatalogAgent(db)

// Add product
product, err := catalogAgent.AddProduct(ctx, userID, "Nasi Goreng", "Makanan", 15000, "porsi")

// Get products
products, err := catalogAgent.GetProducts(ctx, userID, true) // activeOnly

// Update product
err := catalogAgent.UpdateProduct(ctx, userID, productID, map[string]any{
    "default_price": 18000,
    "is_active": false,
})

// Format for WhatsApp
message := catalogAgent.FormatProductList(products)
```

## ContactAgent

```go
contactAgent := NewContactAgent(db)

// Add supplier
supplier, err := contactAgent.AddContact(ctx, userID, "SUPPLIER", "Toko Beras", "081234567890", "Jakarta")

// Add customer
customer, err := contactAgent.AddContact(ctx, userID, "CUSTOMER", "Warung Bu Siti", "081234567891", "Bandung")

// Get contacts
suppliers, err := contactAgent.GetContacts(ctx, userID, "SUPPLIER")
customers, err := contactAgent.GetContacts(ctx, userID, "CUSTOMER")

// Update rating
err := contactAgent.UpdateContactRating(ctx, userID, contactID, 4.5)

// Format for WhatsApp
message := contactAgent.FormatContactList(suppliers, "SUPPLIER")
```

## NotificationAgent

```go
notifAgent := NewNotificationAgent(db)

// Queue low stock alert
err := notifAgent.QueueLowStockAlert(ctx, userID, "Beras", 5.0, 10.0)

// Queue daily report
scheduledTime := time.Now().Add(24 * time.Hour)
err := notifAgent.QueueDailyReport(ctx, userID, scheduledTime)

// Queue custom notification
err := notifAgent.QueueNotification(ctx, userID, "PROMO", "Diskon 20%", "Promo hari ini!", "whatsapp")

// Process queue (call periodically)
err := notifAgent.ProcessNotificationQueue(ctx, func(userID, message string) error {
    // Send via WhatsApp
    return sendWhatsAppMessage(userID, message)
})
```

## Database Client

```go
// Payment
payment := &database.Payment{
    TransactionID: tx.ID,
    Amount:        50000,
    PaymentMethod: "CASH",
    Status:        "PAID",
}
err := db.CreatePayment(ctx, payment)

// Audit Log
auditLog := &database.AuditLog{
    UserID:     userID,
    Action:     "CREATE_SALE",
    EntityType: "transaction",
    EntityID:   tx.ID,
    NewData:    tx,
}
err := db.LogAudit(ctx, auditLog)

// User Preferences
prefs, err := db.GetUserPreferences(ctx, userID)
err := db.UpdateUserPreferences(ctx, userID, map[string]any{
    "low_stock_threshold": 15,
    "report_frequency": "weekly",
})
```

## Integration Examples

### Complete Sale with Payment & Audit

```go
// 1. Record sale
tx, err := financeAgent.RecordSale(ctx, userID, intent)

// 2. Payment is auto-created by FinanceAgent
// 3. Audit log is auto-created by FinanceAgent
// 4. Inventory is auto-updated by InventoryAgent
```

### User Registration with Preferences

```go
// 1. Create user
user := &database.User{
    PhoneNumber: phone,
    Name:        name,
    Role:        "owner",
}
err := db.CreateUser(ctx, user)

// 2. Create default preferences (auto by OnboardingAgent)
prefs := &database.UserPreferences{
    UserID:               user.ID,
    Language:             "id",
    NotificationEnabled:  true,
    LowStockThreshold:    10,
}
err := db.CreateUserPreferences(ctx, prefs)
```

### Low Stock Alert Flow

```go
// 1. Inventory agent detects low stock
alert := inventoryAgent.CheckLowStock(ctx, userID, product)

// 2. Queue notification
if alert != nil {
    notifAgent.QueueLowStockAlert(ctx, userID, product, currentStock, threshold)
}

// 3. Process queue (background job)
notifAgent.ProcessNotificationQueue(ctx, sendFunc)
```
