import { onUnmounted, ref, watch } from 'vue'
import { dataTick } from '../../app/bus'
import { db } from '../../db/norte.db'
import { objectUrl } from '../../db/photos'
import type { Item, List, Task } from '../../db/types'
import { listLabel, liveLists } from './actions'

const byPosition = <T extends { position: number; id: string }>(a: T, b: T) => a.position - b.position || a.id.localeCompare(b.id)

/** Ítems, tareas, listas y fotos de portada vivos; se recargan con cada cambio local o de sync. */
export function useNorteData() {
  const lists = ref<List[]>([])
  const items = ref<Item[]>([])
  const tasks = ref<Task[]>([])
  const photos = ref<Record<string, string>>({})
  const loaded = ref(false)
  let urls: string[] = []

  async function reload() {
    lists.value = await liveLists()
    items.value = (await db.items.toArray()).filter((i) => !i.deletedAt).sort(byPosition)
    tasks.value = (await db.tasks.toArray()).filter((t) => !t.deletedAt).sort(byPosition)
    // Miniatura del ítem: la portada si hay; si no, la primera foto por posición.
    const atts = (await db.attachments.toArray())
      .filter((a) => a.itemId && a.data && !a.deletedAt)
      .sort((a, b) => Number(b.role === 'cover') - Number(a.role === 'cover') || a.position - b.position)
    const next: Record<string, string> = {}
    const covers = new Map<string, Blob>()
    for (const att of atts) if (!covers.has(att.itemId!)) covers.set(att.itemId!, att.data as Blob)
    for (const [itemId, blob] of covers) next[itemId] = objectUrl(blob)
    for (const u of urls) URL.revokeObjectURL(u)
    urls = Object.values(next)
    photos.value = next
    loaded.value = true
  }

  watch(dataTick, reload, { immediate: true })
  onUnmounted(() => { for (const u of urls) URL.revokeObjectURL(u) })

  function listName(listId: string | null): string {
    if (!listId) return listLabel(null)
    return listLabel(lists.value.find((l) => l.id === listId))
  }

  return { lists, items, tasks, photos, loaded, listName, reload }
}
