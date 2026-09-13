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

export function itemScope(area: string, status: string): string {
  return `items:${area}:${status}`
}

export function taskScope(area: string, status: string): string {
  return `tasks:${area}:${status}`
}

export function inspirationScope(area: string): string {
  return `inspirations:${area}`
}
