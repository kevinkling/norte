import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    theme: (localStorage.getItem('norte-theme') as 'light' | 'dark') || 'light',
    search: '',
  }),
  actions: {
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
      localStorage.setItem('norte-theme', this.theme)
      document.documentElement.dataset.theme = this.theme
    },
    applyTheme() {
      document.documentElement.dataset.theme = this.theme
    },
  },
})
