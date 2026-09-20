-- Enlaces/inspiraciones asociados a un ítem (NULL = enlace suelto).
ALTER TABLE inspirations ADD COLUMN item_id TEXT NULL REFERENCES items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inspirations_item
  ON inspirations(item_id, position) WHERE deleted_at IS NULL AND item_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  area TEXT NOT NULL CHECK (area IN ('casa', 'auto', 'both')),
  name TEXT NOT NULL,
  position REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL,
  revision INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS item_tags (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL,
  revision INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tags_area_pos
  ON tags(area, position) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_item_tags_pair_active
  ON item_tags(item_id, tag_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_item_tags_item
  ON item_tags(item_id) WHERE deleted_at IS NULL;
