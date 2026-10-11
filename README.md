# Norte — PWA para Casa y Auto

Organizador personal offline-first: ítems, compras, tareas, inspiración y presupuesto mensual.

## Alcance confirmado del MVP

- La organización usa **categorías y etiquetas**, no proyectos.
- Los servicios se registran como **tareas**.
- Cada ítem admite únicamente un **mes estimado**; no se planifican fechas exactas.
- El presupuesto se define y consulta por **mes**.
- Un ítem puede tener varias inspiraciones o enlaces, y también se pueden
  guardar enlaces sueltos sin asociarlos a un ítem.
- El orden de los ítems es manual mediante arrastrar y soltar; no existe un
  campo de prioridad.

## Alcance futuro

Fuera del MVP quedan estas capacidades:

- Proyectos que agrupen ítems.
- Datos específicos de servicios: fotos, comprobantes, monto e historial.

## Requisitos
- Node 22+
- Un proyecto Supabase con la migración de `supabase/migrations` aplicada

## Datos
IndexedDB es la copia local. Supabase (Postgres + Storage) replica entre dispositivos. No hace falta levantar un API.

Copiá `frontend/.env.example` a `frontend/.env` y completá:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Sin esas variables la app abre igual y no sincroniza.

## Desarrollo
Desde la raíz del repo:

```
pnpm install
pnpm run dev
```

La PWA queda en http://127.0.0.1:5173.

## PWA en iPhone
Safari instala la app (Agregar a inicio) con **HTTPS** o `localhost`. En LAN hace falta un certificado o un túnel; HTTP en `http://host:8080` no alcanza para PWA “de verdad”.

Hay iconos PNG (`apple-touch-icon` 180×180, 192 y 512) y metas Apple. La UI usa `system-ui` / `-apple-system`; no carga fuentes de Google.

## Producción
Frontend en GitHub Pages (`https://kevinkling.github.io/norte/`). El build necesita los secrets `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Las fotos van al bucket `attachments` (máximo 10 MB; jpeg, png, webp, gif o heic).

## Backup
Ver [docs/DEPLOY.md](docs/DEPLOY.md). Contrato de sync: [docs/architecture.md](docs/architecture.md).
