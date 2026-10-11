-- Norte: tablas de sync, RPC y bucket de fotos.
-- Las tablas no se exponen al Data API. anon solo ejecuta los RPC y usa Storage.

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO postgres, service_role, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

CREATE TABLE public.categories (
  id TEXT PRIMARY KEY,
  area TEXT NOT NULL CHECK (area IN ('casa', 'auto', 'both')),
  name TEXT NOT NULL,
  parent_id TEXT NULL REFERENCES public.categories(id) ON DELETE SET NULL,
  position DOUBLE PRECISION NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL,
  revision BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE public.items (
  id TEXT PRIMARY KEY,
  area TEXT NOT NULL CHECK (area IN ('casa', 'auto')),
  name TEXT NOT NULL,
  category_id TEXT NULL REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT,
  estimated_cost_minor BIGINT NULL CHECK (estimated_cost_minor IS NULL OR estimated_cost_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'ARS',
  priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 4),
  target_month TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('idea', 'deseado', 'planificado', 'comprado')),
  reference_url TEXT,
  order_scope TEXT NOT NULL,
  position DOUBLE PRECISION NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL,
  revision BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE public.purchases (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
  purchased_on TEXT NOT NULL,
  paid_amount_minor BIGINT NOT NULL CHECK (paid_amount_minor >= 0),
  currency TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL,
  revision BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE public.tasks (
  id TEXT PRIMARY KEY,
  area TEXT NOT NULL CHECK (area IN ('casa', 'auto')),
  title TEXT NOT NULL,
  notes TEXT,
  due_on TEXT NULL,
  recurrence_rule TEXT NULL,
  recurrence_root_id TEXT NULL REFERENCES public.tasks(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pendiente', 'completada')),
  completed_at TEXT NULL,
  order_scope TEXT NOT NULL,
  position DOUBLE PRECISION NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL,
  revision BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE public.inspirations (
  id TEXT PRIMARY KEY,
  area TEXT NOT NULL CHECK (area IN ('casa', 'auto')),
  item_id TEXT NULL REFERENCES public.items(id) ON DELETE SET NULL,
  category_id TEXT NULL REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT,
  notes TEXT,
  external_url TEXT NOT NULL,
  order_scope TEXT NOT NULL,
  position DOUBLE PRECISION NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL,
  revision BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE public.monthly_budgets (
  id TEXT PRIMARY KEY,
  period TEXT NOT NULL,
  available_minor BIGINT NOT NULL CHECK (available_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'ARS',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL,
  revision BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE public.attachments (
  id TEXT PRIMARY KEY,
  item_id TEXT NULL REFERENCES public.items(id) ON DELETE SET NULL,
  purchase_id TEXT NULL REFERENCES public.purchases(id) ON DELETE SET NULL,
  inspiration_id TEXT NULL REFERENCES public.inspirations(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('cover', 'photo')),
  position DOUBLE PRECISION NOT NULL,
  filename TEXT,
  mime_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL,
  sha256 TEXT NOT NULL,
  content_state TEXT NOT NULL CHECK (content_state IN ('pending', 'ready')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL,
  revision BIGINT NOT NULL DEFAULT 0,
  CHECK (
    (CASE WHEN item_id IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN purchase_id IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN inspiration_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);

CREATE TABLE public.tags (
  id TEXT PRIMARY KEY,
  area TEXT NOT NULL CHECK (area IN ('casa', 'auto', 'both')),
  name TEXT NOT NULL,
  position DOUBLE PRECISION NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL,
  revision BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE public.item_tags (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
  tag_id TEXT NOT NULL REFERENCES public.tags(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL,
  revision BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE public.change_log (
  seq BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('upsert', 'delete')),
  revision BIGINT NOT NULL,
  changed_at TEXT NOT NULL,
  origin_device_id TEXT,
  payload_json JSONB NOT NULL
);

CREATE TABLE public.devices (
  id TEXT PRIMARY KEY,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  last_cursor BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE public.applied_mutations (
  mutation_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE INDEX idx_categories_parent_pos
  ON public.categories(parent_id, position) WHERE deleted_at IS NULL;

CREATE INDEX idx_items_scope_pos
  ON public.items(order_scope, position, id) WHERE deleted_at IS NULL;

CREATE INDEX idx_items_area_status
  ON public.items(area, status) WHERE deleted_at IS NULL;

CREATE INDEX idx_purchases_item_date
  ON public.purchases(item_id, purchased_on DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_purchases_date
  ON public.purchases(purchased_on) WHERE deleted_at IS NULL;

CREATE INDEX idx_tasks_scope_pos
  ON public.tasks(order_scope, position, id) WHERE deleted_at IS NULL;

CREATE INDEX idx_tasks_area_status
  ON public.tasks(area, status, due_on) WHERE deleted_at IS NULL;

CREATE INDEX idx_inspirations_scope_pos
  ON public.inspirations(order_scope, position, id) WHERE deleted_at IS NULL;

CREATE INDEX idx_inspirations_item
  ON public.inspirations(item_id, position) WHERE deleted_at IS NULL AND item_id IS NOT NULL;

CREATE UNIQUE INDEX idx_budgets_period_active
  ON public.monthly_budgets(period) WHERE deleted_at IS NULL;

CREATE INDEX idx_attachments_item
  ON public.attachments(item_id, position) WHERE deleted_at IS NULL AND item_id IS NOT NULL;

CREATE INDEX idx_attachments_purchase
  ON public.attachments(purchase_id, position) WHERE deleted_at IS NULL AND purchase_id IS NOT NULL;

CREATE INDEX idx_attachments_inspiration
  ON public.attachments(inspiration_id, position) WHERE deleted_at IS NULL AND inspiration_id IS NOT NULL;

CREATE INDEX idx_attachments_sha
  ON public.attachments(sha256);

CREATE INDEX idx_tags_area_pos
  ON public.tags(area, position) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_item_tags_pair_active
  ON public.item_tags(item_id, tag_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_item_tags_item
  ON public.item_tags(item_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_change_log_entity
  ON public.change_log(entity_type, entity_id);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspirations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applied_mutations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.categories,
  public.items,
  public.purchases,
  public.tasks,
  public.inspirations,
  public.monthly_budgets,
  public.attachments,
  public.tags,
  public.item_tags,
  public.change_log,
  public.devices,
  public.applied_mutations
FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Sync
-- ---------------------------------------------------------------------------

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
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION private.load_entity(p_type TEXT, p_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table TEXT;
  v_row JSONB;
BEGIN
  v_table := private.table_name(p_type);
  IF v_table IS NULL THEN
    RETURN NULL;
  END IF;
  EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id = $1', v_table)
    INTO v_row
    USING p_id;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION private.write_entity(p_type TEXT, p_record JSONB, p_found BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table TEXT;
  v_cols TEXT;
BEGIN
  v_table := private.table_name(p_type);
  IF v_table IS NULL THEN
    RAISE EXCEPTION 'entidad desconocida';
  END IF;

  IF p_found THEN
    SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
      INTO v_cols
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = v_table
      AND column_name <> 'id';

    EXECUTE format(
      'UPDATE public.%I AS t SET (%s) = (SELECT %s FROM jsonb_populate_record(NULL::public.%I, $1) AS r) WHERE t.id = $2',
      v_table, v_cols, v_cols, v_table
    )
    USING p_record, p_record->>'id';
  ELSE
    EXECUTE format(
      'INSERT INTO public.%I SELECT * FROM jsonb_populate_record(NULL::public.%I, $1)',
      v_table, v_table
    )
    USING p_record;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.apply_sync(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device TEXT;
  v_cursor BIGINT;
  v_limit INT;
  v_now TEXT;
  v_applied JSONB := '[]'::JSONB;
  v_conflicts JSONB := '[]'::JSONB;
  v_blobs JSONB := '[]'::JSONB;
  m JSONB;
  v_mutation_id TEXT;
  v_type TEXT;
  v_entity_id TEXT;
  v_op TEXT;
  v_base BIGINT;
  v_current JSONB;
  v_found BOOLEAN;
  v_rev BIGINT;
  v_new_rev BIGINT;
  v_rec JSONB;
  v_final JSONB;
  v_changes JSONB := '[]'::JSONB;
  v_has_more BOOLEAN := FALSE;
  v_next BIGINT;
BEGIN
  v_device := COALESCE(payload->>'device_id', '');
  IF v_device = '' THEN
    RAISE EXCEPTION 'device_id requerido';
  END IF;

  v_cursor := COALESCE((payload->>'cursor')::BIGINT, 0);
  v_limit := COALESCE((payload->>'limit')::INT, 200);
  IF v_limit <= 0 OR v_limit > 500 THEN
    v_limit := 200;
  END IF;

  v_now := to_char(clock_timestamp() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');

  INSERT INTO public.devices(id, first_seen_at, last_seen_at, last_cursor)
  VALUES (v_device, v_now, v_now, 0)
  ON CONFLICT (id) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at;

  FOR m IN SELECT value FROM jsonb_array_elements(COALESCE(payload->'mutations', '[]'::JSONB))
  LOOP
    v_mutation_id := COALESCE(m->>'mutation_id', '');
    v_type := COALESCE(m->>'entity_type', '');
    v_entity_id := COALESCE(m->>'entity_id', '');
    v_op := COALESCE(m->>'operation', 'upsert');
    IF v_op NOT IN ('upsert', 'delete') THEN
      v_op := 'upsert';
    END IF;
    v_base := COALESCE((m->>'base_revision')::BIGINT, 0);

    IF v_mutation_id = '' OR v_entity_id = '' OR private.table_name(v_type) IS NULL THEN
      v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
        'mutation_id', v_mutation_id,
        'entity_type', v_type,
        'entity_id', v_entity_id,
        'reason', 'invalid_mutation',
        'server', '{}'::JSONB
      ));
      CONTINUE;
    END IF;

    IF EXISTS (SELECT 1 FROM public.applied_mutations WHERE mutation_id = v_mutation_id) THEN
      v_applied := v_applied || jsonb_build_array(to_jsonb(v_mutation_id));
      CONTINUE;
    END IF;

    v_current := private.load_entity(v_type, v_entity_id);
    v_found := v_current IS NOT NULL;
    v_rev := COALESCE((v_current->>'revision')::BIGINT, 0);

    IF v_found AND v_rev <> v_base THEN
      v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
        'mutation_id', v_mutation_id,
        'entity_type', v_type,
        'entity_id', v_entity_id,
        'reason', 'base_revision_mismatch',
        'server', v_current
      ));
      CONTINUE;
    END IF;

    IF NOT v_found AND v_base <> 0 AND v_op <> 'delete' THEN
      v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
        'mutation_id', v_mutation_id,
        'entity_type', v_type,
        'entity_id', v_entity_id,
        'reason', 'missing_record',
        'server', '{}'::JSONB
      ));
      CONTINUE;
    END IF;

    v_rec := COALESCE(m->'record', '{}'::JSONB);
    IF v_rec = 'null'::JSONB OR v_rec IS NULL THEN
      v_rec := '{}'::JSONB;
    END IF;
    v_rec := v_rec - 'data';
    IF v_rec->>'deleted_at' = '' THEN
      v_rec := jsonb_set(v_rec, '{deleted_at}', 'null'::JSONB);
    END IF;

    IF v_found THEN
      v_new_rev := v_rev + 1;
      v_final := v_current || v_rec;
    ELSE
      v_new_rev := 1;
      v_final := v_rec;
    END IF;

    v_final := v_final || jsonb_build_object(
      'id', v_entity_id,
      'revision', v_new_rev,
      'updated_at', v_now
    );

    IF COALESCE(v_final->>'created_at', '') = '' THEN
      v_final := v_final || jsonb_build_object(
        'created_at', COALESCE(NULLIF(v_current->>'created_at', ''), v_now)
      );
    END IF;

    IF v_op = 'delete' THEN
      v_final := v_final || jsonb_build_object('deleted_at', v_now);
    END IF;

    PERFORM private.write_entity(v_type, v_final, v_found);

    INSERT INTO public.change_log(entity_type, entity_id, operation, revision, changed_at, origin_device_id, payload_json)
    VALUES (v_type, v_entity_id, v_op, v_new_rev, v_now, v_device, v_final);

    INSERT INTO public.applied_mutations(mutation_id, device_id, applied_at)
    VALUES (v_mutation_id, v_device, v_now);

    v_applied := v_applied || jsonb_build_array(to_jsonb(v_mutation_id));

    IF v_type = 'attachment' AND v_op = 'upsert' AND COALESCE(v_final->>'content_state', '') <> 'ready' THEN
      v_blobs := v_blobs || jsonb_build_array(to_jsonb(v_entity_id));
    END IF;
  END LOOP;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'seq', c.seq,
      'entity_type', c.entity_type,
      'entity_id', c.entity_id,
      'operation', c.operation,
      'revision', c.revision,
      'changed_at', c.changed_at,
      'record', COALESCE(c.payload_json, '{}'::JSONB)
    ) ORDER BY c.seq
  ), '[]'::JSONB)
  INTO v_changes
  FROM (
    SELECT seq, entity_type, entity_id, operation, revision, changed_at, payload_json
    FROM public.change_log
    WHERE seq > v_cursor
    ORDER BY seq
    LIMIT v_limit + 1
  ) c;

  IF jsonb_array_length(v_changes) > v_limit THEN
    v_has_more := TRUE;
    v_changes := v_changes - v_limit;
  END IF;

  IF jsonb_array_length(v_changes) > 0 THEN
    v_next := (v_changes->(jsonb_array_length(v_changes) - 1)->>'seq')::BIGINT;
  ELSE
    v_next := v_cursor;
  END IF;

  UPDATE public.devices
  SET last_cursor = v_next, last_seen_at = v_now
  WHERE id = v_device;

  RETURN jsonb_build_object(
    'applied', v_applied,
    'conflicts', v_conflicts,
    'changes', v_changes,
    'next_cursor', v_next,
    'has_more', v_has_more,
    'blob_upload_required', v_blobs
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.attachment_content_ready(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id TEXT;
  v_hash TEXT;
  v_mime TEXT;
  v_device TEXT;
  v_size BIGINT;
  v_row JSONB;
  v_now TEXT;
  v_rev BIGINT;
BEGIN
  v_id := COALESCE(payload->>'id', '');
  v_hash := lower(COALESCE(payload->>'sha256', ''));
  v_mime := lower(split_part(COALESCE(payload->>'mime_type', ''), ';', 1));
  v_device := NULLIF(payload->>'device_id', '');
  v_size := COALESCE((payload->>'byte_size')::BIGINT, 0);

  IF v_mime NOT IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic') THEN
    RAISE EXCEPTION 'unsupported content type';
  END IF;
  IF v_size <= 0 OR v_size > 10485760 THEN
    RAISE EXCEPTION 'file too large';
  END IF;

  v_row := private.load_entity('attachment', v_id);
  IF v_row IS NULL OR v_row->>'deleted_at' IS NOT NULL THEN
    RAISE EXCEPTION 'attachment not found';
  END IF;
  IF lower(v_row->>'sha256') <> v_hash THEN
    RAISE EXCEPTION 'sha256 mismatch';
  END IF;

  v_now := to_char(clock_timestamp() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
  v_rev := COALESCE((v_row->>'revision')::BIGINT, 0) + 1;
  v_row := v_row || jsonb_build_object(
    'content_state', 'ready',
    'byte_size', v_size,
    'mime_type', v_mime,
    'revision', v_rev,
    'updated_at', v_now,
    'deleted_at', NULL
  );

  PERFORM private.write_entity('attachment', v_row, TRUE);

  INSERT INTO public.change_log(entity_type, entity_id, operation, revision, changed_at, origin_device_id, payload_json)
  VALUES ('attachment', v_id, 'upsert', v_rev, v_now, v_device, v_row);

  RETURN jsonb_build_object('ok', TRUE, 'revision', v_rev);
END;
$$;

REVOKE ALL ON FUNCTION private.table_name(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.load_entity(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.write_entity(TEXT, JSONB, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.apply_sync(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.attachment_content_ready(JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.apply_sync(JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.attachment_content_ready(JSONB) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync(payload JSONB)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.apply_sync(payload);
$$;

CREATE OR REPLACE FUNCTION public.attachment_content_ready(payload JSONB)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.attachment_content_ready(payload);
$$;

REVOKE ALL ON FUNCTION public.sync(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.attachment_content_ready(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync(JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attachment_content_ready(JSONB) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  FALSE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS attachments_anon_select ON storage.objects;
DROP POLICY IF EXISTS attachments_anon_insert ON storage.objects;
DROP POLICY IF EXISTS attachments_anon_update ON storage.objects;
DROP POLICY IF EXISTS attachments_anon_delete ON storage.objects;

CREATE POLICY attachments_anon_select
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'attachments');

CREATE POLICY attachments_anon_insert
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'attachments');

CREATE POLICY attachments_anon_update
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'attachments')
  WITH CHECK (bucket_id = 'attachments');

CREATE POLICY attachments_anon_delete
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'attachments');
