import { db } from '../db/norte.db'
import { newId, nowIso } from '../db/ids'
import { mutateDomain } from '../db/mutate'
import { sha256Hex } from '../sync/blobs'
import type { Attachment } from '../db/types'

export async function savePhoto(opts: {
  file: File
  role: 'cover' | 'photo'
  itemId?: string | null
  purchaseId?: string | null
  inspirationId?: string | null
  position?: number
}): Promise<string> {
  const id = newId()
  const hash = await sha256Hex(opts.file)
  const now = nowIso()
  const rec: Attachment = {
    id,
    itemId: opts.itemId ?? null,
    purchaseId: opts.purchaseId ?? null,
    inspirationId: opts.inspirationId ?? null,
    role: opts.role,
    position: opts.position ?? 1024,
    filename: opts.file.name,
    mimeType: opts.file.type || 'image/jpeg',
    byteSize: opts.file.size,
    sha256: hash,
    data: opts.file,
    contentState: 'pending',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    revision: 0,
  }
  await db.attachments.put(rec)
  await mutateDomain({
    entityType: 'attachment',
    entityId: id,
    operation: 'upsert',
    table: 'attachments',
    record: rec as unknown as Record<string, unknown>,
  })
  return id
}

export function objectUrl(blob?: Blob | null): string {
  if (!blob) return ''
  return URL.createObjectURL(blob)
}
