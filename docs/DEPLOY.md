# Despliegue y mantenimiento — Norte

Frontend (Cloudflare Pages): `https://norte.kevin-99-kling.workers.dev`

El sync y las fotos salen del browser hacia Supabase. No hay API propio ni Tailscale.

## Proyecto Supabase

1. Creá un proyecto vacío.
2. Aplicá [`supabase/migrations/20261011170000_init_sync.sql`](../supabase/migrations/20261011170000_init_sync.sql).
3. En Cloudflare Pages, variables de entorno del proyecto:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` (clave publicable o anon; no la `service_role`)
4. Se embeben en el build. Sin ellas el sitio abre offline y no sincroniza.

## Cloudflare Pages

Workers & Pages → Create → Connect to Git, repo `norte`:

- Rama de producción: `main`
- Build command: `pnpm install --frozen-lockfile && pnpm build`
- Deploy command: `npx wrangler deploy` (usa [`wrangler.jsonc`](../wrangler.jsonc), que publica `frontend/dist`)
- Variable `NODE_VERSION` = `22`
- Las dos variables `VITE_SUPABASE_*` de arriba

Cada push a `main` despliega solo. `wrangler.jsonc` activa `single-page-application`, así que las rutas internas del router (history mode) devuelven `index.html` sin necesidad de `404.html`.

No hay login. Quien tenga la clave publicable (va dentro del JS publicado) puede leer y escribir. Las tablas no están abiertas al Data API: el cliente solo llama `sync` y `attachment_content_ready`, y usa el bucket `attachments`.

## Backup

Usá los backups de Supabase (base y Storage). No hay `data/norte.db`.

## Desarrollo local

`frontend/.env` con las dos variables y `pnpm run dev` desde la raíz.
