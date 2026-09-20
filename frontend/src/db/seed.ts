import type { Category } from './types'

const ts = '2026-09-13T20:00:00.000Z'

function cat(
  id: string,
  area: Category['area'],
  name: string,
  parentId: string | null,
  position: number,
): Category {
  return {
    id, area, name, parentId, position,
    createdAt: ts, updatedAt: ts, deletedAt: null, revision: 1,
  }
}

/** IDs fijos: coinciden con `backend/internal/database/migrations/002_seed.sql`. */
export const SEED_CATEGORIES: Category[] = [
  cat('01993e10-0000-7000-8000-000000000010', 'casa', 'Muebles', null, 1024),
  cat('01993e10-0000-7000-8000-000000000011', 'casa', 'Living', '01993e10-0000-7000-8000-000000000010', 1024),
  cat('01993e10-0000-7000-8000-000000000012', 'casa', 'Dormitorio', '01993e10-0000-7000-8000-000000000010', 2048),
  cat('01993e10-0000-7000-8000-000000000013', 'casa', 'Cocina', '01993e10-0000-7000-8000-000000000010', 3072),
  cat('01993e10-0000-7000-8000-000000000020', 'casa', 'Electrodomésticos', null, 2048),
  cat('01993e10-0000-7000-8000-000000000030', 'casa', 'Decoración', null, 3072),
  cat('01993e10-0000-7000-8000-000000000040', 'casa', 'Mantenimiento', null, 4096),
  cat('01993e10-0000-7000-8000-000000000050', 'casa', 'Jardín y exterior', null, 5120),
  cat('01993e10-0000-7000-8000-000000000110', 'auto', 'Mantenimiento', null, 1024),
  cat('01993e10-0000-7000-8000-000000000120', 'auto', 'Repuestos', null, 2048),
  cat('01993e10-0000-7000-8000-000000000130', 'auto', 'Accesorios', null, 3072),
  cat('01993e10-0000-7000-8000-000000000140', 'auto', 'Limpieza', null, 4096),
  cat('01993e10-0000-7000-8000-000000000150', 'auto', 'Documentación', null, 5120),
]
