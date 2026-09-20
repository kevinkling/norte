# Norte — arquitectura y sync

Norte es una PWA personal offline-first. IndexedDB (Dexie) es la fuente de verdad de la interfaz. El backend Go + SQLite replica los mismos registros para otros dispositivos en LAN/VPN.

## Seguridad
No hay autenticación en el MVP. El API no debe exponerse a Internet. Acceso solo por red local o VPN.

## Identidad
Los IDs se generan en el cliente (UUID v7). Cada fila sincronizable tiene `revision`, `created_at`, `updated_at`, `deleted_at` (ISO-8601 UTC).

## Sync
`POST /api/v1/sync` aplica mutaciones del outbox (con `base_revision`) y devuelve cambios con `seq` global. Conflicto si `base_revision` no coincide: no hay last-write-wins silencioso.

Las fotos viajan por `PUT/GET /api/v1/attachments/{id}/content`. El JSON de sync no incluye BLOBs.

## Orden
`position` REAL por `order_scope`. Solo se actualiza el ítem movido, salvo rebalanceo cuando el hueco es menor a 1e-9. Las entidades sincronizables incluyen categorías, etiquetas, `item_tags` e inspiraciones (sueltas o con `item_id`).
