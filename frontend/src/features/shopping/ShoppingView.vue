<template>
  <section class="shopping-view">
    <header class="head">
      <h2>Para comprar</h2>
    </header>

    <div class="summary neu">
      <div class="stat">
        <span class="label">Total estimado</span>
        <strong class="value">{{ pesos(totalMinor) }}</strong>
        <span v-if="withoutPrice" class="muted small">{{ withoutPrice }} sin precio</span>
      </div>
      <div class="stat">
        <span class="label">Disponible este mes</span>
        <strong class="value" :class="{ over: budget !== null && totalMinor > remaining }">
          {{ budget === null ? '—' : pesos(remaining) }}
        </strong>
        <RouterLink v-if="budget === null" class="small" to="/presupuesto">Cargar presupuesto</RouterLink>
        <span v-else class="muted small">de {{ pesos(budget) }} · gastado {{ pesos(spent) }}</span>
      </div>
    </div>

    <div v-for="group in groups" :key="group.key" class="group">
      <h3>
        <RouterLink :to="group.listId ? `/l/${group.listId}` : '/bandeja'">{{ group.label }}</RouterLink>
        <span class="muted subtotal">{{ group.subtotal ? pesos(group.subtotal) : '' }}</span>
      </h3>
      <ItemCard
        v-for="item in group.items"
        :key="item.id"
        :item="item"
        :photo="photos[item.id]"
        @open="active = $event"
        @toggle="setItemBought($event, true)"
      />
    </div>

    <p v-if="loaded && !groups.length" class="empty-state muted">
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
.shopping-view {
  display: grid;
  gap: 18px;
}
.head h2 {
  font-family: var(--display);
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0;
}
.summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 14px;
}
.stat {
  display: grid;
  gap: 2px;
  align-content: start;
}
.label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}
.value {
  font-size: 1.35rem;
  font-variant-numeric: tabular-nums;
}
.value.over { color: var(--danger); }
.small { font-size: 0.8rem; }
.group {
  display: grid;
  gap: 8px;
}
.group h3 {
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  font-size: 0.95rem;
}
.group h3 a {
  color: var(--text);
  text-decoration: none;
}
.subtotal {
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}
.empty-state {
  text-align: center;
  padding: 32px 16px;
}
</style>
