# Despliegue y mantenimiento — Norte

El API **no tiene autenticación**. Tailscale Funnel lo deja en internet público.

Frontend (GitHub Pages): `https://kevinkling.github.io/norte/`
Backend (Funnel → esta PC, puerto 8080): `https://korus-1.tail7548d8.ts.net`

Para que el frontend sincronice:
1. Dejá el API corriendo en `:8080` (`pnpm run dev:api` desde la raíz del repo).
2. Funnel persistente: `tailscale funnel --bg 8080`.
3. En Actions, el build usa esa URL por defecto (secret `VITE_API_BASE_URL` la pisa si existe).

## Backup de SQLite
1. Detener escrituras (cerrar el proceso del API).
2. Copiar `data/norte.db` (y si existen `data/norte.db-wal` / `data/norte.db-shm`).
3. Reiniciar.

En PowerShell:

```
Copy-Item data/norte.db "data/backups/norte-$(Get-Date -Format yyyyMMddHHmm).db"
```

## Purga
Al arrancar, el API limpia tombstones y BLOBs más viejos que `TOMBSTONE_TTL_DAYS` (90). También: `POST /api/v1/maintenance/purge`.

## Restauración
Reemplazar `data/norte.db` por el backup y arrancar de nuevo el API.
