CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  area TEXT NOT NULL CHECK (area IN ('casa', 'auto', 'both')),
  name TEXT NOT NULL,
  parent_id TEXT NULL REFERENCES categories(id) ON DELETE SET NULL,
  position REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL,
  revision INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  area TEXT NOT NULL CHECK (area IN ('casa', 'auto')),
  name TEXT NOT NULL,
  category_id TEXT NULL REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  estimated_cost_minor INTEGER NULL CHECK (estimated_cost_minor IS NULL OR estimated_cost_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'ARS',
  priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 4),
  target_month TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('idea', 'deseado', 'planificado', 'comprado')),
  reference_url TEXT,
  order_scope TEXT NOT NULL,
  position REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL,
  revision INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  purchased_on TEXT NOT NULL,
  paid_amount_minor INTEGER NOT NULL CHECK (paid_amount_minor >= 0),
  currency TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL,
  revision INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  area TEXT NOT NULL CHECK (area IN ('casa', 'auto')),
  title TEXT NOT NULL,
  notes TEXT,
  due_on TEXT NULL,
  recurrence_rule TEXT NULL,
  recurrence_root_id TEXT NULL REFERENCES tasks(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pendiente', 'completada')),
  completed_at TEXT NULL,
  order_scope TEXT NOT NULL,
  position REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL,
  revision INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inspirations (
  id TEXT PRIMARY KEY,
  area TEXT NOT NULL CHECK (area IN ('casa', 'auto')),
  category_id TEXT NULL REFERENCES categories(id) ON DELETE SET NULL,
  title TEXT,
  notes TEXT,
  external_url TEXT NOT NULL,
  order_scope TEXT NOT NULL,
  position REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL,
  revision INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS monthly_budgets (
  id TEXT PRIMARY KEY,
  period TEXT NOT NULL,
  available_minor INTEGER NOT NULL CHECK (available_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'ARS',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL,
  revision INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  item_id TEXT NULL REFERENCES items(id) ON DELETE SET NULL,
  purchase_id TEXT NULL REFERENCES purchases(id) ON DELETE SET NULL,
  inspiration_id TEXT NULL REFERENCES inspirations(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('cover', 'photo')),
  position REAL NOT NULL,
  filename TEXT,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  data BLOB NULL,
  content_state TEXT NOT NULL CHECK (content_state IN ('pending', 'ready')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  CHECK (
    (CASE WHEN item_id IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN purchase_id IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN inspiration_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);

CREATE TABLE IF NOT EXISTS change_log (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('upsert', 'delete')),
  revision INTEGER NOT NULL,
  changed_at TEXT NOT NULL,
  origin_device_id TEXT,
  payload_json TEXT
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  last_cursor INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS applied_mutations (
  mutation_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_parent_pos
  ON categories(parent_id, position) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_items_scope_pos
  ON items(order_scope, position, id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_items_area_status
  ON items(area, status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_purchases_item_date
  ON purchases(item_id, purchased_on DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_purchases_date
  ON purchases(purchased_on) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_scope_pos
  ON tasks(order_scope, position, id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_area_status
  ON tasks(area, status, due_on) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inspirations_scope_pos
  ON inspirations(order_scope, position, id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_period_active
  ON monthly_budgets(period) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_attachments_item
  ON attachments(item_id, position) WHERE deleted_at IS NULL AND item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attachments_purchase
  ON attachments(purchase_id, position) WHERE deleted_at IS NULL AND purchase_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attachments_inspiration
  ON attachments(inspiration_id, position) WHERE deleted_at IS NULL AND inspiration_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attachments_sha
  ON attachments(sha256);

CREATE INDEX IF NOT EXISTS idx_change_log_entity
  ON change_log(entity_type, entity_id);
