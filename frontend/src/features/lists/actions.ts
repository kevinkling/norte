import { db } from '../../db/norte.db'
import { itemScope, newId, nowIso, taskScope } from '../../db/ids'
import { mutateDomain } from '../../db/mutate'
import type { DomainTableName, EntityType, Inspiration, Item, ItemTag, List, Task } from '../../db/types'
import { describeLink, sameLink } from '../../utils/links'
import { needsRebalance, positionAfter, positionForMove, rebalancePositions } from '../../utils/position'
import { addInterval } from '../../utils/recurrence'

type Rec = Record<string, unknown>

const upsert = <T extends { id: string }>(entityType: EntityType, table: DomainTableName, record: T) =>
  mutateDomain({ entityType, entityId: record.id, operation: 'upsert', table, record: record as unknown as Rec })

export const remove = (entityType: EntityType, table: DomainTableName, id: string) =>
  mutateDomain({ entityType, entityId: id, operation: 'delete', table, record: { id } })

export async function liveLists(): Promise<List[]> {
  return (await db.lists.toArray())
    .filter((l) => !l.deletedAt)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
}

export function listLabel(list: Pick<List, 'name' | 'emoji'> | null | undefined): string {
  if (!list) return 'Bandeja'
  return list.emoji ? `${list.emoji} ${list.name}` : list.name
}

async function lastPosition(table: 'items' | 'tasks' | 'inspirations', scope: string): Promise<number | undefined> {
  const rows = await db[table].where('orderScope').equals(scope).toArray()
  const alive = rows.filter((r) => !r.deletedAt)
  if (!alive.length) return undefined
  return Math.max(...alive.map((r) => r.position))
}

export async function nextPosition(table: 'items' | 'tasks' | 'inspirations', scope: string): Promise<number> {
  return positionAfter(await lastPosition(table, scope))
}

// ---------------------------------------------------------------------------
// Listas
// ---------------------------------------------------------------------------

export async function saveList(input: { id?: string; name: string; emoji: string }): Promise<string> {
  const existing = input.id ? await db.lists.get(input.id) : undefined
  const lists = await liveLists()
  const id = existing?.id ?? newId()
  const rec: List = {
    id,
    name: input.name.trim(),
    emoji: input.emoji.trim(),
    position: existing?.position ?? positionAfter(lists.at(-1)?.position),
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    deletedAt: null,
    revision: existing?.revision ?? 0,
  }
  await upsert('list', 'lists', rec)
  return id
}

/** Archiva la lista; sus ítems y tareas pasan a la Bandeja para no perderlos. */
export async function archiveList(id: string): Promise<void> {
  const items = (await db.items.where('listId').equals(id).toArray()).filter((i) => !i.deletedAt)
  for (const item of items) await moveItemToList(item, null)
  const tasks = (await db.tasks.where('listId').equals(id).toArray()).filter((t) => !t.deletedAt)
  for (const task of tasks) await moveTaskToList(task, null)
  await remove('list', 'lists', id)
}

// ---------------------------------------------------------------------------
// Ítems
// ---------------------------------------------------------------------------

export async function findItemByUrl(url: string): Promise<Item | undefined> {
  const items = await db.items.filter((i) => !i.deletedAt && Boolean(i.referenceUrl) && sameLink(i.referenceUrl, url)).toArray()
  return items[0]
}

/** Alta rápida: solo nombre y, opcionalmente, un link. */
export async function createItem(input: { name?: string; listId: string | null; url?: string }): Promise<Item> {
  const url = input.url?.trim() ?? ''
  const name = input.name?.trim() || (url ? describeLink(url).defaultTitle : 'Sin nombre')
  const scope = itemScope(input.listId, 'deseado')
  const rec: Item = {
    id: newId(),
    area: null,
    listId: input.listId,
    name,
    categoryId: null,
    description: '',
    estimatedCostMinor: null,
    currency: 'ARS',
    priority: 3,
    targetMonth: null,
    status: 'deseado',
    referenceUrl: url,
    orderScope: scope,
    position: positionAfter(await lastPosition('items', scope)),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deletedAt: null,
    revision: 0,
  }
  await upsert('item', 'items', rec)
  if (url) await syncItemLinks(rec, [{ id: '', title: '', url }])
  return rec
}

export async function moveItemToList(item: Item, listId: string | null): Promise<void> {
  if (item.listId === listId) return
  const scope = itemScope(listId, item.status)
  await upsert('item', 'items', {
    ...item,
    listId,
    orderScope: scope,
    position: positionAfter(await lastPosition('items', scope)),
  })
  const links = (await db.inspirations.where('itemId').equals(item.id).toArray()).filter((r) => !r.deletedAt)
  for (const link of links) {
    await upsert('inspiration', 'inspirations', { ...link, listId, orderScope: itemScope(listId, 'links') })
  }
}

export async function setItemBought(item: Item, bought: boolean): Promise<void> {
  const status = bought ? 'comprado' : 'deseado'
  if (item.status === status) return
  const scope = itemScope(item.listId, status)
  await upsert('item', 'items', { ...item, status, orderScope: scope, position: positionAfter(await lastPosition('items', scope)) })
}

export type LinkDraft = { id: string; title: string; url: string }

export async function syncItemLinks(item: Item, links: LinkDraft[]): Promise<void> {
  const existing = (await db.inspirations.where('itemId').equals(item.id).toArray()).filter((r) => !r.deletedAt)
  const urls = links.map((l) => ({ ...l, url: l.url.trim() })).filter((l) => l.url)
  const keep = new Set(urls.map((u) => u.id).filter(Boolean))
  for (const row of existing) {
    if (!keep.has(row.id)) await remove('inspiration', 'inspirations', row.id)
  }
  let pos = 1024
  for (const link of urls) {
    const rowId = link.id || newId()
    const prev = existing.find((r) => r.id === rowId)
    const rec: Inspiration = {
      id: rowId,
      area: null,
      listId: item.listId,
      itemId: item.id,
      categoryId: prev?.categoryId ?? null,
      title: link.title,
      notes: prev?.notes ?? '',
      externalUrl: link.url,
      orderScope: itemScope(item.listId, 'links'),
      position: pos,
      createdAt: prev?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
      deletedAt: null,
      revision: prev?.revision ?? 0,
    }
    await upsert('inspiration', 'inspirations', rec)
    pos += 1024
  }
}

export async function syncItemTags(itemId: string, tagIds: string[]): Promise<void> {
  const existing = (await db.itemTags.where('itemId').equals(itemId).toArray()).filter((r) => !r.deletedAt)
  const wanted = new Set(tagIds)
  for (const row of existing) {
    if (!wanted.has(row.tagId)) await remove('item_tag', 'itemTags', row.id)
  }
  for (const tagId of tagIds) {
    if (existing.some((r) => r.tagId === tagId)) continue
    const rec: ItemTag = { id: newId(), itemId, tagId, createdAt: nowIso(), updatedAt: nowIso(), deletedAt: null, revision: 0 }
    await upsert('item_tag', 'itemTags', rec)
  }
}

// ---------------------------------------------------------------------------
// Tareas
// ---------------------------------------------------------------------------

export async function createTask(input: { title: string; listId: string | null }): Promise<Task> {
  const scope = taskScope(input.listId, 'pendiente')
  const rec: Task = {
    id: newId(),
    area: null,
    listId: input.listId,
    title: input.title.trim(),
    notes: '',
    dueOn: null,
    recurrenceRule: null,
    recurrenceRootId: null,
    status: 'pendiente',
    completedAt: null,
    orderScope: scope,
    position: positionAfter(await lastPosition('tasks', scope)),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deletedAt: null,
    revision: 0,
  }
  await upsert('task', 'tasks', rec)
  return rec
}

export async function moveTaskToList(task: Task, listId: string | null): Promise<void> {
  if (task.listId === listId) return
  const scope = taskScope(listId, task.status)
  await upsert('task', 'tasks', { ...task, listId, orderScope: scope, position: positionAfter(await lastPosition('tasks', scope)) })
}

/** Completa o reabre una tarea; si es recurrente, crea la próxima. */
export async function toggleTask(task: Task): Promise<void> {
  if (task.status === 'pendiente') {
    await upsert('task', 'tasks', {
      ...task, status: 'completada', completedAt: nowIso(), orderScope: taskScope(task.listId, 'completada'),
    })
    if (task.recurrenceRule) {
      const nextDue = addInterval(task.dueOn || nowIso().slice(0, 10), task.recurrenceRule)
      if (nextDue) {
        const scope = taskScope(task.listId, 'pendiente')
        const rec: Task = {
          ...task, id: newId(), status: 'pendiente', completedAt: null, dueOn: nextDue,
          recurrenceRootId: task.recurrenceRootId ?? task.id,
          orderScope: scope,
          position: positionAfter(await lastPosition('tasks', scope)),
          createdAt: nowIso(), updatedAt: nowIso(), deletedAt: null, revision: 0,
        }
        await upsert('task', 'tasks', rec)
      }
    }
  } else {
    await upsert('task', 'tasks', {
      ...task, status: 'pendiente', completedAt: null, orderScope: taskScope(task.listId, 'pendiente'),
    })
  }
}

// ---------------------------------------------------------------------------
// Orden manual
// ---------------------------------------------------------------------------

/** Guarda el nuevo orden después de un drag & drop (mismo algoritmo que antes). */
export async function reorderRows<T extends { id: string; position: number }>(
  entityType: EntityType,
  table: DomainTableName,
  before: T[],
  next: T[],
): Promise<void> {
  const movedIndex = next.findIndex((row, i) => row.id !== before[i]?.id)
  if (movedIndex < 0) return
  const moved = next[movedIndex]
  const pos = positionForMove(next, movedIndex)
  await upsert(entityType, table, { ...moved, position: pos })
  if (needsRebalance(next.map((x, i) => (i === movedIndex ? pos : x.position)))) {
    for (const row of rebalancePositions(next)) {
      const original = next.find((x) => x.id === row.id)
      if (original) await upsert(entityType, table, { ...original, position: row.position })
    }
  }
}

/** Mueve la fila seleccionada una posición (botones Subir/Bajar). */
export function nudged<T>(rows: T[], index: number, delta: number): T[] | null {
  const j = index + delta
  if (index < 0 || j < 0 || j >= rows.length) return null
  const arr = [...rows]
  const [row] = arr.splice(index, 1)
  arr.splice(j, 0, row)
  return arr
}
