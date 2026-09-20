import type { Attachment, Category, EntityType, Inspiration, Item, ItemTag, MonthlyBudget, Purchase, Tag, Task } from '../db/types'

const camelToSnake: Record<string, string> = {
  parentId: 'parent_id',
  categoryId: 'category_id',
  estimatedCostMinor: 'estimated_cost_minor',
  targetMonth: 'target_month',
  referenceUrl: 'reference_url',
  orderScope: 'order_scope',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  itemId: 'item_id',
  purchasedOn: 'purchased_on',
  paidAmountMinor: 'paid_amount_minor',
  dueOn: 'due_on',
  recurrenceRule: 'recurrence_rule',
  recurrenceRootId: 'recurrence_root_id',
  completedAt: 'completed_at',
  externalUrl: 'external_url',
  availableMinor: 'available_minor',
  purchaseId: 'purchase_id',
  inspirationId: 'inspiration_id',
  mimeType: 'mime_type',
  byteSize: 'byte_size',
  contentState: 'content_state',
  tagId: 'tag_id',
}

const snakeToCamel = Object.fromEntries(Object.entries(camelToSnake).map(([k, v]) => [v, k]))

export function toSnake(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(record)) {
    if (k === 'data') continue
    out[camelToSnake[k] ?? k] = v ?? null
  }
  return out
}

export function toCamel<T>(record: Record<string, unknown>): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(record)) {
    if (k === 'data') continue
    out[snakeToCamel[k] ?? k] = v ?? null
  }
  return out as T
}

export type DomainTable =
  | 'categories'
  | 'tags'
  | 'itemTags'
  | 'items'
  | 'purchases'
  | 'tasks'
  | 'inspirations'
  | 'monthlyBudgets'
  | 'attachments'

export const entityTable: Record<EntityType, DomainTable> = {
  category: 'categories',
  tag: 'tags',
  item_tag: 'itemTags',
  item: 'items',
  purchase: 'purchases',
  task: 'tasks',
  inspiration: 'inspirations',
  monthly_budget: 'monthlyBudgets',
  attachment: 'attachments',
}

export type AnyDomain = Category | Tag | ItemTag | Item | Purchase | Task | Inspiration | MonthlyBudget | Attachment
