ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS is_review_pending boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_reason character varying(64);

CREATE INDEX IF NOT EXISTS idx_products_review_pending 
  ON products (is_review_pending) 
  WHERE is_review_pending = true;
