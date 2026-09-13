<template>
  <section>
    <h2>Presupuesto mensual</h2>
    <form class="neu form" @submit.prevent="saveBudget">
      <label class="field"><span>Mes</span><input v-model="period" type="month" required /></label>
      <label class="field"><span>Monto disponible</span><input v-model="amount" inputmode="decimal" required /></label>
      <button class="btn btn-primary" type="submit">Guardar presupuesto</button>
    </form>
    <AppCard>
      <p>Disponible: <strong>{{ pesos(available) }}</strong></p>
      <p>Gastado en el mes: <strong>{{ pesos(spent) }}</strong></p>
      <p>Restante: <strong>{{ pesos(remaining) }}</strong></p>
    </AppCard>
    <h3>Sugerencias para este mes</h3>
    <p v-if="!combos.length" class="muted">No hay combinaciones que entren en el presupuesto con ítems deseados o planificados.</p>
    <AppCard v-for="(combo, i) in combos" :key="i" class="gap">
      <p><strong>Opción {{ i + 1 }}</strong> {{ combo.approximate ? '(aproximada)' : '' }} · {{ pesos(combo.totalMinor) }}</p>
      <ul>
        <li v-for="item in combo.items" :key="item.id">{{ item.name }} · {{ pesos(item.estimatedCostMinor) }}</li>
      </ul>
    </AppCard>
  </section>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppCard from '../../components/ui/AppCard.vue'
import { dataTick } from '../../app/bus'
import { db } from '../../db/norte.db'
import { currentMonth, newId, nowIso } from '../../db/ids'
import { mutateDomain } from '../../db/mutate'
import type { Item, MonthlyBudget, Purchase } from '../../db/types'
import { parsePesos, pesos } from '../../utils/money'
import { suggestCombinations } from './suggest'

const period = ref(currentMonth())
const amount = ref('')
const budgets = ref<MonthlyBudget[]>([])
const items = ref<Item[]>([])
const purchases = ref<Purchase[]>([])

watch(dataTick, async () => {
  budgets.value = await db.monthlyBudgets.toArray()
  items.value = await db.items.toArray()
  purchases.value = await db.purchases.toArray()
  const current = budgets.value.find((b) => !b.deletedAt && b.period === period.value)
  if (current) amount.value = String(current.availableMinor / 100)
}, { immediate: true })

const current = computed(() => budgets.value.find((b) => !b.deletedAt && b.period === period.value) ?? null)
const available = computed(() => current.value?.availableMinor ?? parsePesos(amount.value))
const spent = computed(() =>
  purchases.value
    .filter((p) => !p.deletedAt && p.purchasedOn.startsWith(period.value))
    .reduce((s, p) => s + p.paidAmountMinor, 0),
)
const remaining = computed(() => available.value - spent.value)
const combos = computed(() => suggestCombinations(items.value, Math.max(0, remaining.value), period.value))

async function saveBudget() {
  const existing = current.value
  const id = existing?.id ?? newId()
  const rec: MonthlyBudget = {
    id, period: period.value, availableMinor: parsePesos(amount.value), currency: 'ARS', notes: existing?.notes ?? '',
    createdAt: existing?.createdAt ?? nowIso(), updatedAt: nowIso(), deletedAt: null, revision: existing?.revision ?? 0,
  }
  await mutateDomain({ entityType: 'monthly_budget', entityId: id, operation: 'upsert', table: 'monthlyBudgets', record: rec as unknown as Record<string, unknown> })
}
</script>
<style scoped>
.form { padding: 16px; margin-bottom: 12px; }
.gap { margin-bottom: 10px; }
</style>
