import Dexie, { type Table } from 'dexie'
import { SEED_CATEGORIES, SEED_LISTS } from './seed'
import { migrateCategoryOrTagV3, migrateInspirationV3, migrateItemV3, migrateTaskV3 } from './migrateV3'
import type {
  Attachment,
  Category,
  ConflictRow,
  Inspiration,
  Item,
  ItemTag,
  List,
  MonthlyBudget,
  OutboxEntry,
  Purchase,
  SyncState,
  Tag,
  Task,
} from './types'

export class NorteDB extends Dexie {
  lists!: Table<List, string>
  categories!: Table<Category, string>
  tags!: Table<Tag, string>
  itemTags!: Table<ItemTag, string>
  items!: Table<Item, string>
  purchases!: Table<Purchase, string>
  tasks!: Table<Task, string>
  inspirations!: Table<Inspiration, string>
  monthlyBudgets!: Table<MonthlyBudget, string>
  attachments!: Table<Attachment, string>
  outbox!: Table<OutboxEntry, number>
  syncState!: Table<SyncState, string>
  conflicts!: Table<ConflictRow, string>

  constructor() {
    super('norte')
    this.version(1).stores({
      categories: '&id, area, parentId, [parentId+position], deletedAt',
      items: '&id, area, status, categoryId, targetMonth, orderScope, [orderScope+position], updatedAt, deletedAt',
      purchases: '&id, itemId, purchasedOn, updatedAt, deletedAt',
      tasks: '&id, area, status, dueOn, orderScope, [orderScope+position], updatedAt, deletedAt',
      inspirations: '&id, area, categoryId, orderScope, [orderScope+position], updatedAt, deletedAt',
      monthlyBudgets: '&id, &period, updatedAt, deletedAt',
      attachments: '&id, itemId, purchaseId, inspirationId, sha256, contentState, deletedAt',
      outbox: '++localId, &mutationId, entityType, entityId, clientSeq, status, createdAt',
      syncState: '&key',
      conflicts: '&id, entityType, entityId, detectedAt',
    })
    this.version(2).stores({
      categories: '&id, area, parentId, [parentId+position], deletedAt',
      tags: '&id, area, name, [area+position], deletedAt',
      itemTags: '&id, itemId, tagId, [itemId+tagId], deletedAt',
      items: '&id, area, status, categoryId, targetMonth, orderScope, [orderScope+position], updatedAt, deletedAt',
      purchases: '&id, itemId, purchasedOn, updatedAt, deletedAt',
      tasks: '&id, area, status, dueOn, orderScope, [orderScope+position], updatedAt, deletedAt',
      inspirations: '&id, area, itemId, categoryId, orderScope, [orderScope+position], updatedAt, deletedAt',
      monthlyBudgets: '&id, &period, updatedAt, deletedAt',
      attachments: '&id, itemId, purchaseId, inspirationId, sha256, contentState, deletedAt',
      outbox: '++localId, &mutationId, entityType, entityId, clientSeq, status, createdAt',
      syncState: '&key',
      conflicts: '&id, entityType, entityId, detectedAt',
    })
    // v3: listas propias en lugar de áreas fijas (ver migrateV3.ts)
    this.version(3).stores({
      lists: '&id, position, deletedAt',
      categories: '&id, area, parentId, [parentId+position], deletedAt',
      tags: '&id, area, name, [area+position], deletedAt',
      itemTags: '&id, itemId, tagId, [itemId+tagId], deletedAt',
      items: '&id, listId, area, status, categoryId, targetMonth, orderScope, [orderScope+position], updatedAt, deletedAt',
      purchases: '&id, itemId, purchasedOn, updatedAt, deletedAt',
      tasks: '&id, listId, area, status, dueOn, orderScope, [orderScope+position], updatedAt, deletedAt',
      inspirations: '&id, listId, area, itemId, categoryId, orderScope, [orderScope+position], updatedAt, deletedAt',
      monthlyBudgets: '&id, &period, updatedAt, deletedAt',
      attachments: '&id, itemId, purchaseId, inspirationId, sha256, contentState, deletedAt',
      outbox: '++localId, &mutationId, entityType, entityId, clientSeq, status, createdAt',
      syncState: '&key',
      conflicts: '&id, entityType, entityId, detectedAt',
    }).upgrade(async (tx) => {
      await tx.table('lists').bulkPut(SEED_LISTS)
      await tx.table('items').toCollection().modify((row) => migrateItemV3(row))
      await tx.table('tasks').toCollection().modify((row) => migrateTaskV3(row))
      await tx.table('inspirations').toCollection().modify((row) => migrateInspirationV3(row))
      await tx.table('categories').toCollection().modify((row) => migrateCategoryOrTagV3(row))
      await tx.table('tags').toCollection().modify((row) => migrateCategoryOrTagV3(row))
      // Mutaciones viejas en cola: que lleguen al servidor ya con lista.
      await tx.table('outbox').toCollection().modify((row) => {
        const rec = row.record as Record<string, unknown> | null
        if (!rec || !('area' in rec)) return
        if (!['item', 'task', 'inspiration'].includes(row.entityType)) return
        const camel: Record<string, unknown> = { ...rec, listId: rec.list_id, itemId: rec.item_id }
        if (row.entityType === 'item') migrateItemV3(camel)
        else if (row.entityType === 'task') migrateTaskV3(camel)
        else migrateInspirationV3(camel)
        rec.list_id = camel.listId
        if (row.entityType === 'item') rec.status = camel.status
        rec.order_scope = camel.orderScope
      })
    })
  }
}

export const db = new NorteDB()

db.on('ready', async () => {
  await ensureLocalCategorySeed()
})

export async function ensureLocalCategorySeed(): Promise<void> {
  for (const row of SEED_LISTS) {
    const existing = await db.lists.get(row.id)
    if (!existing) await db.lists.put(row)
  }
  for (const row of SEED_CATEGORIES) {
    const existing = await db.categories.get(row.id)
    if (!existing) await db.categories.put(row)
  }
}

export async function live<T>(table: Table<T, string>): Promise<T[]> {
  return table.filter((row) => !(row as { deletedAt?: string | null }).deletedAt).toArray()
}
