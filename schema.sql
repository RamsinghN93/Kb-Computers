-- KB Computers D1 Schema
-- Run with: wrangler d1 execute kb-computers-db --file=./schema.sql

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  icon TEXT DEFAULT '🖥️',
  tag TEXT DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0)
);

CREATE TABLE IF NOT EXISTS repairs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  device TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Normal',
  problem TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Awaiting Accessories',
  created TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_repairs_phone ON repairs(phone);
CREATE INDEX IF NOT EXISTS idx_repairs_id_phone ON repairs(id, phone);

-- Demo products (safe to run multiple times)
INSERT OR IGNORE INTO products (id, name, price, icon, tag, stock) VALUES
  ('p1', '16GB DDR4 RAM', 2999, '🧠', 'Popular', 5),
  ('p2', '1TB NVMe SSD', 5499, '💾', 'Fast', 3),
  ('p3', 'Wireless Keyboard & Mouse', 899, '⌨️', 'Value', 8),
  ('p4', '650W Power Supply', 3499, '⚡', 'Build', 2);
