import { db } from '../db/norte.db'
import { getAttachment, putAttachment } from './client'

export async function sha256Hex(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function flushBlobs(deviceId: string): Promise<void> {
  const rows = await db.attachments.filter((a) => !a.deletedAt).toArray()
  for (const att of rows) {
    if (att.contentState !== 'ready' && att.data) {
      await putAttachment(att.id, att.data, deviceId)
      await db.attachments.update(att.id, { contentState: 'ready' })
    } else if (att.contentState === 'ready' && !att.data) {
      try {
        const blob = await getAttachment(att.id)
        await db.attachments.update(att.id, { data: blob })
      } catch {
        // sin red o aún no subido en el servidor
      }
    }
  }
}
