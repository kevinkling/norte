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
- Go 1.22+
- SQLite 3.38+ (opcional en host; el API crea y migra la base)

## Base de datos
La SQLite vive en `data/norte.db` (raíz del repo). El API la crea y aplica migraciones al arrancar.

El backend se levanta **solo** con:

```
pnpm run dev:api
```

Eso corre Go desde `backend/` y, si no definís `SQLITE_PATH`, usa `data/norte.db` de la raíz.

Variables (ver `.env.example`):
- `SQLITE_PATH=data/norte.db`
- `PORT=8080`
- `TOMBSTONE_TTL_DAYS=90`
- `MAX_UPLOAD_BYTES=10485760`

## Desarrollo
Desde la raíz del repo:

```
pnpm install
pnpm run dev
```

En otra terminal, la API:

```
pnpm run dev:api
```

Si preferís entrar al frontend:

```
cd frontend
pnpm install
pnpm run dev
```

La PWA queda en http://127.0.0.1:5173 y proxea `/api` al backend.

## PWA en iPhone
Safari instala la app (Agregar a inicio) con **HTTPS** o `localhost`. En LAN hace falta un certificado o un túnel; HTTP en `http://host:8080` no alcanza para PWA “de verdad”.

Hay iconos PNG (`apple-touch-icon` 180×180, 192 y 512) y metas Apple. La UI usa `system-ui` / `-apple-system`; no carga fuentes de Google.

## Producción
Frontend en GitHub Pages (`https://kevinkling.github.io/norte/`). Backend en esta PC (`pnpm run dev:api`) y Tailscale Funnel hacia el puerto 8080.

## Backup
Ver [docs/DEPLOY.md](docs/DEPLOY.md). Contrato de sync: [docs/architecture.md](docs/architecture.md).
