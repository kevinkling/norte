import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null

export function supabaseConfigured(): boolean {
  return supabase != null
}

function client(): SupabaseClient {
  if (!supabase) throw new Error('Supabase no configurado')
  return supabase
}

export async function postSync(deviceId: string, cursor: number, mutations: SyncMutation[], limit = 200): Promise<SyncResponse> {
  const { data, error } = await client().rpc('sync', {
    payload: { device_id: deviceId, cursor, limit, mutations },
  })
  if (error) throw new Error(error.message)
  return data as SyncResponse
}

export async function putAttachment(
  id: string,
  blob: Blob,
  deviceId: string,
  meta: { sha256: string; byteSize: number; mimeType: string },
): Promise<void> {
  const sb = client()
  const { error: uploadError } = await sb.storage.from('attachments').upload(id, blob, {
    upsert: true,
    contentType: blob.type || meta.mimeType || 'image/jpeg',
  })
  if (uploadError) throw new Error(uploadError.message)

  const { error } = await sb.rpc('attachment_content_ready', {
    payload: {
      id,
      sha256: meta.sha256,
      byte_size: meta.byteSize,
      mime_type: blob.type || meta.mimeType || 'image/jpeg',
      device_id: deviceId,
    },
  })
  if (error) throw new Error(error.message)
}

export async function getAttachment(id: string): Promise<Blob> {
  const { data, error } = await client().storage.from('attachments').download(id)
  if (error) throw new Error(error.message)
  if (!data) throw new Error('download vacío')
  return data
}
