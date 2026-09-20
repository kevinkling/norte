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
La SQLite vive en `data/norte.db`. El API la crea y aplica migraciones al arrancar.

```
go run ./backend/cmd/norte-api
```

Variables (ver `.env.example`):
- `SQLITE_PATH=data/norte.db`
- `PORT=8080`
- `TOMBSTONE_TTL_DAYS=90`
- `MAX_UPLOAD_BYTES=10485760`

No publiques este API en Internet: no tiene autenticación. Usalo en LAN o VPN.

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

## Docker
```
docker compose up --build
```
Nginx sirve la PWA en http://localhost:8080 y enruta `/api` al contenedor Go. El volumen `./data` persiste SQLite.

## Backup
Ver [docs/DEPLOY.md](docs/DEPLOY.md). Contrato de sync: [docs/architecture.md](docs/architecture.md).
