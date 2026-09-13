-- Categorías iniciales (IDs fijos para que cliente y servidor coincidan).
-- change_log se escribe para que el primer pull las entregue.

INSERT OR IGNORE INTO categories (id, area, name, parent_id, position, created_at, updated_at, deleted_at, revision) VALUES
  ('01993e10-0000-7000-8000-000000000010', 'casa', 'Muebles', NULL, 1024, '2026-09-13T20:00:00.000Z', '2026-09-13T20:00:00.000Z', NULL, 1),
  ('01993e10-0000-7000-8000-000000000011', 'casa', 'Living', '01993e10-0000-7000-8000-000000000010', 1024, '2026-09-13T20:00:00.000Z', '2026-09-13T20:00:00.000Z', NULL, 1),
  ('01993e10-0000-7000-8000-000000000012', 'casa', 'Dormitorio', '01993e10-0000-7000-8000-000000000010', 2048, '2026-09-13T20:00:00.000Z', '2026-09-13T20:00:00.000Z', NULL, 1),
  ('01993e10-0000-7000-8000-000000000013', 'casa', 'Cocina', '01993e10-0000-7000-8000-000000000010', 3072, '2026-09-13T20:00:00.000Z', '2026-09-13T20:00:00.000Z', NULL, 1),
  ('01993e10-0000-7000-8000-000000000020', 'casa', 'Electrodomésticos', NULL, 2048, '2026-09-13T20:00:00.000Z', '2026-09-13T20:00:00.000Z', NULL, 1),
  ('01993e10-0000-7000-8000-000000000030', 'casa', 'Decoración', NULL, 3072, '2026-09-13T20:00:00.000Z', '2026-09-13T20:00:00.000Z', NULL, 1),
  ('01993e10-0000-7000-8000-000000000040', 'casa', 'Mantenimiento', NULL, 4096, '2026-09-13T20:00:00.000Z', '2026-09-13T20:00:00.000Z', NULL, 1),
  ('01993e10-0000-7000-8000-000000000050', 'casa', 'Jardín y exterior', NULL, 5120, '2026-09-13T20:00:00.000Z', '2026-09-13T20:00:00.000Z', NULL, 1),
  ('01993e10-0000-7000-8000-000000000110', 'auto', 'Mantenimiento', NULL, 1024, '2026-09-13T20:00:00.000Z', '2026-09-13T20:00:00.000Z', NULL, 1),
  ('01993e10-0000-7000-8000-000000000120', 'auto', 'Repuestos', NULL, 2048, '2026-09-13T20:00:00.000Z', '2026-09-13T20:00:00.000Z', NULL, 1),
  ('01993e10-0000-7000-8000-000000000130', 'auto', 'Accesorios', NULL, 3072, '2026-09-13T20:00:00.000Z', '2026-09-13T20:00:00.000Z', NULL, 1),
  ('01993e10-0000-7000-8000-000000000140', 'auto', 'Limpieza', NULL, 4096, '2026-09-13T20:00:00.000Z', '2026-09-13T20:00:00.000Z', NULL, 1),
  ('01993e10-0000-7000-8000-000000000150', 'auto', 'Documentación', NULL, 5120, '2026-09-13T20:00:00.000Z', '2026-09-13T20:00:00.000Z', NULL, 1);

INSERT OR IGNORE INTO change_log (entity_type, entity_id, operation, revision, changed_at, origin_device_id, payload_json)
SELECT 'category', id, 'upsert', revision, updated_at, 'seed',
  json_object(
    'id', id,
    'area', area,
    'name', name,
    'parent_id', parent_id,
    'position', position,
    'created_at', created_at,
    'updated_at', updated_at,
    'deleted_at', deleted_at,
    'revision', revision
  )
FROM categories
WHERE id LIKE '01993e10-0000-7000-8000-%'
  AND NOT EXISTS (
    SELECT 1 FROM change_log c WHERE c.entity_type = 'category' AND c.entity_id = categories.id
  );
