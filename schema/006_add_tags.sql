-- Tags table (drop and recreate to ensure all columns exist)
DROP TABLE IF EXISTS product_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;

CREATE TABLE tags (
  id BIGINT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product-Tag relations (many-to-many)
CREATE TABLE IF NOT EXISTS product_tags (
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  tag_id BIGINT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

-- Indexes for tag filtering
CREATE INDEX IF NOT EXISTS idx_product_tags_product ON product_tags(product_id);
CREATE INDEX IF NOT EXISTS idx_product_tags_tag ON product_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_title ON tags(title);
CREATE INDEX IF NOT EXISTS idx_tags_visible ON tags(is_visible) WHERE is_visible = true;

