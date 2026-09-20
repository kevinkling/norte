import Dexie, { type Table } from 'dexie'
import { SEED_CATEGORIES } from './seed'
import type {
  Attachment,
  Category,
  ConflictRow,
  Inspiration,
  Item,
  ItemTag,
  MonthlyBudget,
  OutboxEntry,
  Purchase,
  SyncState,
  Tag,
  Task,
} from './types'

export class NorteDB extends Dexie {
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
  }
}

export const db = new NorteDB()

db.on('ready', async () => {
  await ensureLocalCategorySeed()
})

export async function ensureLocalCategorySeed(): Promise<void> {
  for (const row of SEED_CATEGORIES) {
    const existing = await db.categories.get(row.id)
    if (!existing) await db.categories.put(row)
  }
}

export async function live<T>(table: Table<T, string>): Promise<T[]> {
  return table.filter((row) => !(row as { deletedAt?: string | null }).deletedAt).toArray()
}
