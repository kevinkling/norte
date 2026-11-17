import { v7 as uuidv7 } from 'uuid'

export function newId(): string {
  return uuidv7()
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Clave de la Bandeja en los scopes de orden (listId null). */
export const INBOX = 'inbox'

export function itemScope(listId: string | null, status: string): string {
  return `items:${listId ?? INBOX}:${status}`
}

export function taskScope(listId: string | null, status: string): string {
  return `tasks:${listId ?? INBOX}:${status}`
}

export function inspirationScope(listId: string | null): string {
  return `inspirations:${listId ?? INBOX}`
}
