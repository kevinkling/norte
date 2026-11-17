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

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppShell,
      children: [
        { path: '', redirect: () => `/l/${storedListId()}` },
        { path: 'l/:listId', component: ListView, props: true },
        { path: 'bandeja', component: InboxView },
        { path: 'comprar', component: ShoppingView },
        // Destino del Atajo de iOS: /nuevo?url=…&text=…&title=…
        { path: 'nuevo', component: CaptureView },
        { path: 'casa', redirect: `/l/${LIST_CASA_ID}` },
        { path: 'auto', redirect: `/l/${LIST_AUTO_ID}` },
        { path: 'compras', component: PurchasesView },
        { path: 'tareas', component: TasksView },
        { path: 'inspiracion', component: InspirationsView },
        { path: 'organizar', component: OrganizeView },
        { path: 'presupuesto', component: BudgetView },
        { path: 'conflictos', component: ConflictsView },
        { path: 'mas', component: MoreView },
        { path: ':pathMatch(.*)*', redirect: '/' },
      ],
    },
  ],
})
