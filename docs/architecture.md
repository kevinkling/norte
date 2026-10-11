# Norte — arquitectura y sync

Norte es una PWA personal offline-first. IndexedDB (Dexie) es la fuente de verdad de la interfaz. Supabase (Postgres + Storage) replica los mismos registros entre dispositivos.

## Seguridad
No hay usuarios ni login. La clave publicable vive en el cliente. Las tablas tienen RLS y no tienen políticas para `anon`: el Data API no lee ni escribe filas. El rol `anon` solo ejecuta `sync` / `attachment_content_ready` y usa el bucket privado `attachments`.

## Identidad
Los IDs se generan en el cliente (UUID v7). Cada fila sincronizable tiene `revision`, `created_at`, `updated_at`, `deleted_at` (ISO-8601 UTC).

## Sync
`rpc sync` aplica mutaciones del outbox (con `base_revision`) y devuelve cambios con `seq` global. Conflicto si `base_revision` no coincide: no hay last-write-wins silencioso.

Las fotos van a Storage (`attachments/<id>`). El JSON de sync no incluye BLOBs. Después de subir, `attachment_content_ready` marca `content_state = ready` si el `sha256` coincide.

## Orden
`position` REAL por `order_scope`. Solo se actualiza el ítem movido, salvo rebalanceo cuando el hueco es menor a 1e-9. Las entidades sincronizables incluyen categorías, etiquetas, `item_tags` e inspiraciones (sueltas o con `item_id`).
