import Dexie, { type Table } from 'dexie'
import type {
  Attachment,
  Category,
  ConflictRow,
  Inspiration,
  Item,
  MonthlyBudget,
  OutboxEntry,
  Purchase,
  SyncState,
  Task,
} from './types'

export class NorteDB extends Dexie {
  categories!: Table<Category, string>
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
  }
}

export const db = new NorteDB()

export async function live<T>(table: Table<T, string>): Promise<T[]> {
  return table.filter((row) => !(row as { deletedAt?: string | null }).deletedAt).toArray()
}
