<template>
  <section class="page">
    <div class="summary card">
      <div class="stat">
        <span class="stat-label">Total estimado</span>
        <strong class="stat-value">{{ pesos(totalMinor) }}</strong>
        <span v-if="withoutPrice" class="stat-sub">{{ withoutPrice }} sin precio</span>
      </div>
      <div class="stat">
        <span class="stat-label">Disponible este mes</span>
        <strong class="stat-value" :class="{ over: budget !== null && totalMinor > remaining }">
          {{ budget === null ? '—' : pesos(remaining) }}
        </strong>
        <RouterLink v-if="budget === null" class="stat-sub" to="/presupuesto">Cargar presupuesto</RouterLink>
        <span v-else class="stat-sub">de {{ pesos(budget) }} · gastado {{ pesos(spent) }}</span>
      </div>
    </div>

    <div v-for="group in groups" :key="group.key" class="section">
      <h2 class="sec-h">
        <RouterLink :to="group.listId ? `/l/${group.listId}` : '/bandeja'">{{ group.label }}</RouterLink>
        <span class="count">{{ group.items.length }}</span>
        <span v-if="group.subtotal" class="aside">{{ pesos(group.subtotal) }}</span>
      </h2>
      <div class="group">
        <ItemCard
          v-for="item in group.items"
          :key="item.id"
          :item="item"
          :photo="photos[item.id]"
          @open="active = $event"
          @toggle="setItemBought($event, true)"
        />
      </div>
    </div>

    <p v-if="loaded && !groups.length" class="empty-state">
      No tenés nada pendiente de compra. Agregalo desde una lista o guardá un link en la Bandeja.
    </p>

    <ItemSheet :item="active" @close="active = null" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ItemCard from '../../components/items/ItemCard.vue'
import ItemSheet from '../../components/items/ItemSheet.vue'
import { dataTick } from '../../app/bus'
import { db } from '../../db/norte.db'
import { currentMonth } from '../../db/ids'
import type { Item, MonthlyBudget, Purchase } from '../../db/types'
import { pesos } from '../../utils/money'
import { setItemBought } from '../lists/actions'
import { useNorteData } from '../lists/useData'

const { lists, items, photos, loaded, listName } = useNorteData()
const budgets = ref<MonthlyBudget[]>([])
const purchases = ref<Purchase[]>([])
const active = ref<Item | null>(null)
const period = currentMonth()

watch(dataTick, async () => {
  budgets.value = await db.monthlyBudgets.toArray()
  purchases.value = await db.purchases.toArray()
}, { immediate: true })

const pending = computed(() => items.value.filter((i) => i.status !== 'comprado'))
const totalMinor = computed(() => pending.value.reduce((s, i) => s + (i.estimatedCostMinor ?? 0), 0))
const withoutPrice = computed(() => pending.value.filter((i) => !i.estimatedCostMinor).length)

const budget = computed(() => budgets.value.find((b) => !b.deletedAt && b.period === period)?.availableMinor ?? null)
const spent = computed(() =>
  purchases.value.filter((p) => !p.deletedAt && p.purchasedOn.startsWith(period)).reduce((s, p) => s + p.paidAmountMinor, 0),
)
const remaining = computed(() => (budget.value ?? 0) - spent.value)

const groups = computed(() => {
  const order: (string | null)[] = [...lists.value.map((l) => l.id), null]
  return order
    .map((listId) => {
      const rows = pending.value.filter((i) => i.listId === listId)
      return {
        key: listId ?? 'inbox',
        listId,
        label: listName(listId),
        items: rows,
        subtotal: rows.reduce((s, i) => s + (i.estimatedCostMinor ?? 0), 0),
      }
    })
    .filter((g) => g.items.length)
})
</script>

<style scoped>
.summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.stat {
  display: grid;
  gap: 2px;
  align-content: start;
  padding: var(--sp-3) var(--sp-4);
}
.stat + .stat { border-left: 1px solid var(--border); }
.stat-label {
  font-size: var(--fs-xs);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.stat-value { font-size: var(--fs-lg); font-weight: 600; font-variant-numeric: tabular-nums; }
.stat-value.over { color: var(--danger); }
.stat-sub { font-size: var(--fs-xs); color: var(--muted); }
a.stat-sub { color: var(--accent); font-weight: 600; }
</style>
