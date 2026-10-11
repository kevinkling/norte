# Despliegue y mantenimiento — Norte

Frontend (GitHub Pages): `https://kevinkling.github.io/norte/`

El sync y las fotos salen del browser hacia Supabase. No hay API propio ni Tailscale.

## Proyecto Supabase

1. Creá un proyecto vacío.
2. Aplicá [`supabase/migrations/20261011170000_init_sync.sql`](../supabase/migrations/20261011170000_init_sync.sql).
3. En GitHub, secrets del repo:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` (clave publicable o anon; no la `service_role`)
4. El workflow de Pages las embebe en el build. Sin ellas el sitio abre offline y no sincroniza.

No hay login. Quien tenga la clave publicable (va dentro del JS publicado) puede leer y escribir. Las tablas no están abiertas al Data API: el cliente solo llama `sync` y `attachment_content_ready`, y usa el bucket `attachments`.

## Backup

Usá los backups de Supabase (base y Storage). No hay `data/norte.db`.

## Desarrollo local

`frontend/.env` con las dos variables y `pnpm run dev` desde la raíz.
