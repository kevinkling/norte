-- Norte: listas propias (reemplazan las áreas fijas Casa/Auto).
-- items, tasks e inspirations ganan list_id; list_id NULL = Bandeja.
-- El frontend hace la misma transformación localmente (Dexie v3), con los mismos IDs.

CREATE TABLE public.lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '',
  position DOUBLE PRECISION NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL,
  revision BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_lists_pos ON public.lists(position) WHERE deleted_at IS NULL;

ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lists FROM anon, authenticated;

-- Listas iniciales con IDs fijos (iguales a SEED_LISTS en frontend/src/db/seed.ts).
INSERT INTO public.lists (id, name, emoji, position, created_at, updated_at, deleted_at, revision) VALUES
  ('01993e10-0000-7000-8000-000000000201', 'Casa', '🏠', 1024, '2026-11-17T00:00:00.000Z', '2026-11-17T00:00:00.000Z', NULL, 1),
  ('01993e10-0000-7000-8000-000000000202', 'Auto', '🚗', 2048, '2026-11-17T00:00:00.000Z', '2026-11-17T00:00:00.000Z', NULL, 1)
ON CONFLICT (id) DO NOTHING;

-- list_id en items, tareas e inspiraciones
ALTER TABLE public.items ADD COLUMN list_id TEXT NULL REFERENCES public.lists(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN list_id TEXT NULL REFERENCES public.lists(id) ON DELETE SET NULL;
ALTER TABLE public.inspirations ADD COLUMN list_id TEXT NULL REFERENCES public.lists(id) ON DELETE SET NULL;

UPDATE public.items SET list_id = CASE area
  WHEN 'casa' THEN '01993e10-0000-7000-8000-000000000201'
  WHEN 'auto' THEN '01993e10-0000-7000-8000-000000000202'
END;
UPDATE public.tasks SET list_id = CASE area
  WHEN 'casa' THEN '01993e10-0000-7000-8000-000000000201'
  WHEN 'auto' THEN '01993e10-0000-7000-8000-000000000202'
END;
UPDATE public.inspirations SET list_id = CASE area
  WHEN 'casa' THEN '01993e10-0000-7000-8000-000000000201'
  WHEN 'auto' THEN '01993e10-0000-7000-8000-000000000202'
END;

-- area queda como dato legado
ALTER TABLE public.items ALTER COLUMN area DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN area DROP NOT NULL;
ALTER TABLE public.inspirations ALTER COLUMN area DROP NOT NULL;
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_area_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_area_check;
ALTER TABLE public.inspirations DROP CONSTRAINT IF EXISTS inspirations_area_check;

-- Categorías y etiquetas pasan a globales
UPDATE public.categories SET area = 'both';
UPDATE public.tags SET area = 'both';

-- Estados: solo pendiente (deseado) / comprado
UPDATE public.items SET status = 'deseado' WHERE status IN ('idea', 'planificado');

-- Scopes de orden por lista (inbox = Bandeja)
UPDATE public.items
  SET order_scope = 'items:' || COALESCE(list_id, 'inbox') || ':' || status;
UPDATE public.tasks
  SET order_scope = 'tasks:' || COALESCE(list_id, 'inbox') || ':' || status;
UPDATE public.inspirations
  SET order_scope = CASE
    WHEN item_id IS NOT NULL THEN 'items:' || COALESCE(list_id, 'inbox') || ':links'
    ELSE 'inspirations:' || COALESCE(list_id, 'inbox')
  END;

CREATE INDEX idx_items_list_status ON public.items(list_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_list_status ON public.tasks(list_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_inspirations_list ON public.inspirations(list_id) WHERE deleted_at IS NULL;

-- Sync: nueva entidad 'list'
CREATE OR REPLACE FUNCTION private.table_name(p_type TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_type
    WHEN 'category' THEN 'categories'
    WHEN 'item' THEN 'items'
    WHEN 'purchase' THEN 'purchases'
    WHEN 'task' THEN 'tasks'
    WHEN 'inspiration' THEN 'inspirations'
    WHEN 'monthly_budget' THEN 'monthly_budgets'
    WHEN 'attachment' THEN 'attachments'
    WHEN 'tag' THEN 'tags'
    WHEN 'item_tag' THEN 'item_tags'
    WHEN 'list' THEN 'lists'
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION private.table_name(TEXT) FROM PUBLIC;
