import { defineStore } from 'pinia'
import { LIST_CASA_ID } from '../db/seed'

const LIST_KEY = 'norte-list'

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Última lista abierta (también la usa el router para la ruta inicial). */
export function storedListId(): string {
  return readStorage(LIST_KEY) || LIST_CASA_ID
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    theme: (readStorage('norte-theme') as 'light' | 'dark') || 'light',
    currentListId: storedListId(),
    search: '',
  }),
  actions: {
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
      try { localStorage.setItem('norte-theme', this.theme) } catch { /* sin storage */ }
      document.documentElement.dataset.theme = this.theme
    },
    applyTheme() {
      document.documentElement.dataset.theme = this.theme
    },
    setList(listId: string) {
      this.currentListId = listId
      try { localStorage.setItem(LIST_KEY, listId) } catch { /* sin storage */ }
    },
  },
})
