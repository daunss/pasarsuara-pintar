# Phase 5 Plan - Marketplace Features

**Timeline:** 2 weeks  
**Status:** 🔴 Starting  
**Goal:** Enable B2B marketplace for UMKM to buy/sell products

---

## 🎯 Objectives

Enable UMKM to:
1. List products for sale (become sellers)
2. Browse products from other sellers
3. Place orders
4. Track deliveries
5. Rate & review sellers

---

## 📋 Features Breakdown

### 5.1 Seller Profile (Week 1, Day 1-2)

**Database:**
- [ ] Add seller_profiles table
- [ ] Add product_listings table
- [ ] Add seller_ratings table

**UI:**
- [ ] Seller profile page
- [ ] Public seller view
- [ ] Seller verification badge
- [ ] Business hours display
- [ ] Delivery areas

**Backend:**
- [ ] Seller registration flow
- [ ] Profile CRUD operations
- [ ] Verification system

---

### 5.2 Product Listings (Week 1, Day 3-4)

**Database:**
- [ ] Extend product_catalog for marketplace
- [ ] Add listing_status (DRAFT, ACTIVE, SOLD_OUT)
- [ ] Add pricing tiers (bulk discounts)

**UI:**
- [ ] List product for sale
- [ ] Product detail page
- [ ] Image upload
- [ ] Pricing configuration
- [ ] Stock management

**Backend:**
- [ ] Listing CRUD
- [ ] Image storage (Supabase Storage)
- [ ] Search & filter
- [ ] Category management

---

### 5.3 Marketplace Browse (Week 1, Day 5-7)

**UI:**
- [ ] Marketplace homepage
- [ ] Product grid/list view
- [ ] Search bar
- [ ] Category filter
- [ ] Price range filter
- [ ] Location filter
- [ ] Sort options

**Backend:**
- [ ] Search API
- [ ] Filter logic
- [ ] Pagination
- [ ] Relevance ranking

---

### 5.4 Order Management (Week 2, Day 1-3)

**Database:**
- [ ] Add orders table
- [ ] Add order_items table
- [ ] Add order_status_history table

**UI:**
- [ ] Shopping cart
- [ ] Checkout flow
- [ ] Order confirmation
- [ ] Order history
- [ ] Order tracking

**Backend:**
- [ ] Order creation
- [ ] Inventory reservation
- [ ] Order status updates
- [ ] Notification triggers

---

### 5.5 Rating & Reviews (Week 2, Day 4-5)

**Database:**
- [ ] Add reviews table
- [ ] Add review_responses table

**UI:**
- [ ] Rating form
- [ ] Review list
- [ ] Seller response
- [ ] Review moderation

**Backend:**
- [ ] Review CRUD
- [ ] Rating calculation
- [ ] Spam detection

---

### 5.6 Seller Dashboard (Week 2, Day 6-7)

**UI:**
- [ ] Seller analytics
- [ ] Order management
- [ ] Inventory sync
- [ ] Sales reports
- [ ] Customer insights

**Backend:**
- [ ] Analytics aggregation
- [ ] Report generation
- [ ] Performance metrics

---

## 🗄️ Database Schema

### seller_profiles
```sql
CREATE TABLE seller_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
    business_name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    verification_status TEXT DEFAULT 'PENDING',
    verification_date TIMESTAMP,
    business_hours JSONB,
    delivery_areas TEXT[],
    min_order_amount DECIMAL(15,2),
    avg_rating DECIMAL(3,2) DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### product_listings
```sql
CREATE TABLE product_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES seller_profiles(id),
    product_catalog_id UUID REFERENCES product_catalog(id),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price DECIMAL(15,2) NOT NULL,
    unit TEXT NOT NULL,
    min_order_qty INTEGER DEFAULT 1,
    stock_qty INTEGER NOT NULL,
    images TEXT[],
    bulk_pricing JSONB,
    listing_status TEXT DEFAULT 'ACTIVE',
    views_count INTEGER DEFAULT 0,
    orders_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### orders
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES seller_profiles(id),
    order_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'PENDING',
    subtotal DECIMAL(15,2) NOT NULL,
    delivery_fee DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    delivery_address TEXT,
    delivery_notes TEXT,
    estimated_delivery DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### order_items
```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    listing_id UUID NOT NULL REFERENCES product_listings(id),
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### reviews
```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES seller_profiles(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    images TEXT[],
    seller_response TEXT,
    response_date TIMESTAMP,
    is_verified_purchase BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎨 UI Pages

### Marketplace Pages
1. `/marketplace` - Browse all products
2. `/marketplace/[category]` - Category view
3. `/marketplace/product/[id]` - Product detail
4. `/marketplace/seller/[id]` - Seller profile
5. `/marketplace/cart` - Shopping cart
6. `/marketplace/checkout` - Checkout flow

### Seller Pages
7. `/seller/dashboard` - Seller analytics
8. `/seller/products` - Manage listings
9. `/seller/orders` - Order management
10. `/seller/profile` - Edit profile
11. `/seller/reviews` - Reviews & ratings

### Buyer Pages
12. `/orders` - Order history
13. `/orders/[id]` - Order detail & tracking

---

## 🔧 Technical Implementation

### Frontend
- Next.js pages with SSR
- Real-time updates (Supabase Realtime)
- Image optimization
- Responsive design
- Shopping cart state (Zustand)

### Backend
- Supabase functions for complex logic
- Image storage (Supabase Storage)
- Search with PostgreSQL full-text
- Order processing workflow
- Email notifications

### Integration
- WhatsApp notifications for orders
- AI agent for order placement via chat
- Inventory sync with catalog

---

## 🎯 Success Metrics

- [ ] 50+ sellers registered
- [ ] 500+ products listed
- [ ] 100+ orders placed
- [ ] 4.0+ average seller rating
- [ ] <5% order cancellation rate

---

## 🚀 Quick Wins (MVP)

For fastest time to market, prioritize:

1. ✅ Basic seller profile
2. ✅ Simple product listing
3. ✅ Browse & search
4. ✅ Basic order flow
5. ✅ Simple rating system

Skip for later:
- Advanced analytics
- Bulk pricing
- Seller verification
- Review moderation
- Complex delivery tracking

---

## 📝 Next Steps

1. Create database migrations
2. Build seller profile UI
3. Implement product listing
4. Create marketplace browse
5. Build order flow
6. Add rating system

**Let's start with database schema!** 🚀
