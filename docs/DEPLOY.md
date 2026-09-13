# Despliegue y mantenimiento — Norte

El API no tiene autenticación. Exponelo solo en red local o VPN.

## Backup de SQLite
1. Detener escrituras (`docker compose stop api` o cerrar el proceso).
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
