export type SyncMutation = {
  mutation_id: string
  entity_type: string
  entity_id: string
  operation: 'upsert' | 'delete'
  base_revision: number
  record: Record<string, unknown> | null
}

export type SyncResponse = {
  applied: string[]
  conflicts: Array<{
    mutation_id: string
    entity_type: string
    entity_id: string
    reason: string
    server: Record<string, unknown>
  }>
  changes: Array<{
    seq: number
    entity_type: string
    entity_id: string
    operation: 'upsert' | 'delete'
    revision: number
    changed_at: string
    record: Record<string, unknown>
  }>
  next_cursor: number
  has_more: boolean
  blob_upload_required: string[]
}

const API = '/api/v1'

export async function postSync(deviceId: string, cursor: number, mutations: SyncMutation[], limit = 200): Promise<SyncResponse> {
  const res = await fetch(`${API}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Device-Id': deviceId },
    body: JSON.stringify({ device_id: deviceId, cursor, limit, mutations }),
  })
  if (!res.ok) throw new Error(`sync ${res.status}`)
  return res.json()
}

export async function putAttachment(id: string, blob: Blob, deviceId: string): Promise<void> {
  const res = await fetch(`${API}/attachments/${id}/content`, {
    method: 'PUT',
    headers: { 'Content-Type': blob.type || 'image/jpeg', 'X-Device-Id': deviceId },
    body: blob,
  })
  if (!res.ok) throw new Error(`upload ${res.status}`)
}

export async function getAttachment(id: string): Promise<Blob> {
  const res = await fetch(`${API}/attachments/${id}/content`)
  if (!res.ok) throw new Error(`download ${res.status}`)
  return res.blob()
}
