import { createRouter, createWebHistory } from 'vue-router'
import AppShell from '../components/layout/AppShell.vue'
import ListView from '../features/lists/ListView.vue'
import InboxView from '../features/inbox/InboxView.vue'
import CaptureView from '../features/capture/CaptureView.vue'
import ShoppingView from '../features/shopping/ShoppingView.vue'
import PurchasesView from '../features/purchases/PurchasesView.vue'
import TasksView from '../features/tasks/TasksView.vue'
import InspirationsView from '../features/inspirations/InspirationsView.vue'
import OrganizeView from '../features/organize/OrganizeView.vue'
import BudgetView from '../features/budgets/BudgetView.vue'
import ConflictsView from '../features/conflicts/ConflictsView.vue'
import MoreView from '../features/more/MoreView.vue'
import { LIST_AUTO_ID, LIST_CASA_ID } from '../db/seed'
import { storedListId } from '../stores/ui'

declare module 'vue-router' {
  interface RouteMeta {
    /** Título que muestra la barra superior. */
    title?: string
    /** Si existe, la barra muestra una flecha para volver a esta ruta. */
    back?: string
  }
}

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppShell,
      children: [
        { path: '', redirect: () => `/l/${storedListId()}` },
        { path: 'l/:listId', component: ListView, props: true },
        { path: 'bandeja', component: InboxView, meta: { title: 'Bandeja' } },
        { path: 'comprar', component: ShoppingView, meta: { title: 'Para comprar' } },
        // Destino del Atajo de iOS: /nuevo?url=…&text=…&title=…
        { path: 'nuevo', component: CaptureView, meta: { title: 'Guardar link' } },
        { path: 'casa', redirect: `/l/${LIST_CASA_ID}` },
        { path: 'auto', redirect: `/l/${LIST_AUTO_ID}` },
        { path: 'compras', component: PurchasesView, meta: { title: 'Compras', back: '/mas' } },
        { path: 'tareas', component: TasksView, meta: { title: 'Tareas', back: '/mas' } },
        { path: 'inspiracion', component: InspirationsView, meta: { title: 'Ideas', back: '/mas' } },
        { path: 'organizar', component: OrganizeView, meta: { title: 'Categorías', back: '/mas' } },
        { path: 'presupuesto', component: BudgetView, meta: { title: 'Presupuesto' } },
        { path: 'conflictos', component: ConflictsView, meta: { title: 'Conflictos', back: '/mas' } },
        { path: 'mas', component: MoreView, meta: { title: 'Más' } },
        { path: ':pathMatch(.*)*', redirect: '/' },
      ],
    },
  ],
})
