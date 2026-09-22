import { createRouter, createWebHistory } from 'vue-router'
import AppShell from '../components/layout/AppShell.vue'
import ItemsView from '../features/items/ItemsView.vue'
import PurchasesView from '../features/purchases/PurchasesView.vue'
import TasksView from '../features/tasks/TasksView.vue'
import InspirationsView from '../features/inspirations/InspirationsView.vue'
import OrganizeView from '../features/organize/OrganizeView.vue'
import BudgetView from '../features/budgets/BudgetView.vue'
import ConflictsView from '../features/conflicts/ConflictsView.vue'
import MoreView from '../features/more/MoreView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AppShell,
      children: [
        { path: '', redirect: '/casa' },
        { path: 'casa', component: ItemsView, props: { area: 'casa' } },
        { path: 'auto', component: ItemsView, props: { area: 'auto' } },
        { path: 'compras', component: PurchasesView },
        { path: 'tareas', component: TasksView },
        { path: 'inspiracion', component: InspirationsView },
        { path: 'organizar', component: OrganizeView },
        { path: 'presupuesto', component: BudgetView },
        { path: 'conflictos', component: ConflictsView },
        { path: 'mas', component: MoreView },
      ],
    },
  ],
})
