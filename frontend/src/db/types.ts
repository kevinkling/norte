export type Area = 'casa' | 'auto'
export type CategoryArea = Area | 'both'
export type ItemStatus = 'idea' | 'deseado' | 'planificado' | 'comprado'
export type TaskStatus = 'pendiente' | 'completada'
export type EntityType =
  | 'category'
  | 'item'
  | 'purchase'
  | 'task'
  | 'inspiration'
  | 'monthly_budget'
  | 'attachment'
  | 'tag'
  | 'item_tag'

export interface SyncMeta {
  id: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  revision: number
}

export interface Category extends SyncMeta {
  area: CategoryArea
  name: string
  parentId: string | null
  position: number
}

export interface Tag extends SyncMeta {
  area: CategoryArea
  name: string
  position: number
}

export interface ItemTag extends SyncMeta {
  itemId: string
  tagId: string
}

export interface Item extends SyncMeta {
  area: Area
  name: string
  categoryId: string | null
  description: string
  estimatedCostMinor: number | null
  currency: string
  priority: 1 | 2 | 3 | 4
  targetMonth: string | null
  status: ItemStatus
  referenceUrl: string
  orderScope: string
  position: number
}

export interface Purchase extends SyncMeta {
  itemId: string
  purchasedOn: string
  paidAmountMinor: number
  currency: string
  notes: string
}

export interface Task extends SyncMeta {
  area: Area
  title: string
  notes: string
  dueOn: string | null
  recurrenceRule: string | null
  recurrenceRootId: string | null
  status: TaskStatus
  completedAt: string | null
  orderScope: string
  position: number
}

export interface Inspiration extends SyncMeta {
  area: Area
  itemId: string | null
  categoryId: string | null
  title: string
  notes: string
  externalUrl: string
  orderScope: string
  position: number
}

export interface MonthlyBudget extends SyncMeta {
  period: string
  availableMinor: number
  currency: string
  notes: string
}

export interface Attachment extends SyncMeta {
  itemId: string | null
  purchaseId: string | null
  inspirationId: string | null
  role: 'cover' | 'photo'
  position: number
  filename: string
  mimeType: string
  byteSize: number
  sha256: string
  data?: Blob | null
  contentState: 'pending' | 'ready'
}

export interface OutboxEntry {
  localId?: number
  mutationId: string
  entityType: EntityType
  entityId: string
  operation: 'upsert' | 'delete'
  baseRevision: number
  record: Record<string, unknown> | null
  clientSeq: number
  status: 'pending' | 'sending'
  createdAt: string
}

export interface SyncState {
  key: string
  value: unknown
}

export interface ConflictRow {
  id: string
  entityType: EntityType
  entityId: string
  detectedAt: string
  local: Record<string, unknown>
  remote: Record<string, unknown>
  reason: string
  resolution: 'local' | 'remote' | null
}

export type DomainRecord =
  | Category
  | Tag
  | ItemTag
  | Item
  | Purchase
  | Task
  | Inspiration
  | MonthlyBudget
  | Attachment

export type DomainTableName =
  | 'categories'
  | 'tags'
  | 'itemTags'
  | 'items'
  | 'purchases'
  | 'tasks'
  | 'inspirations'
  | 'monthlyBudgets'
  | 'attachments'
