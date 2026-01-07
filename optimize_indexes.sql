-- Optimizing queries for Photos and Sales

-- 1. Photos Table Indexes
-- Filtering by event is the most common operation
CREATE INDEX IF NOT EXISTS idx_photos_event_id ON photos(event_id);

-- Filtering by photographer (for dashboards)
CREATE INDEX IF NOT EXISTS idx_photos_photographer_id ON photos(photographer_id);

-- Sorting by recent (feeds)
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);

-- Public/Private filtering
CREATE INDEX IF NOT EXISTS idx_photos_is_public ON photos(is_public);

-- 2. Sales Table Indexes
-- "My Purchases" queries
CREATE INDEX IF NOT EXISTS idx_sales_buyer_id ON sales(buyer_id);

-- "Has Purchased" check (composite index might be better but simple ones help too)
CREATE INDEX IF NOT EXISTS idx_sales_buyer_photo ON sales(buyer_id, photo_id);

-- Photographer sales report
CREATE INDEX IF NOT EXISTS idx_sales_photographer_id ON sales(photographer_id);
