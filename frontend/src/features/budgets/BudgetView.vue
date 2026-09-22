<template>
  <section class="budget-view">
    <header class="head">
      <h2>Presupuesto</h2>
    </header>

    <!-- Héroe del presupuesto -->
    <div class="budget-hero neu" :class="{ 'over-budget': remaining < 0 }">
      <span class="hero-label">Restante este mes</span>
      <h1 class="hero-amount">{{ pesos(remaining) }}</h1>
      
      <div class="progress-container">
        <div class="progress-bar" :style="{ width: `${progress}%` }" :class="{ 'danger': remaining < 0 }"></div>
      </div>

      <div class="budget-summary">
        <div class="summary-item">
          <span class="summary-label">Disponible</span>
          <span class="summary-value">{{ pesos(available) }}</span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item">
          <span class="summary-label">Gastado</span>
          <span class="summary-value">{{ pesos(spent) }}</span>
        </div>
      </div>
    </div>

    <!-- Sugerencias para este mes -->
    <div class="suggestions-section">
      <h3>Sugerencias de compra</h3>
      <p v-if="!combos.length" class="muted empty-suggestions">
        No hay combinaciones que entren en el presupuesto con ítems deseados o planificados.
      </p>
      
      <div v-else class="combos-list">
        <AppCard v-for="(combo, i) in combos" :key="i" class="combo-card">
          <div class="combo-header">
            <strong>Opción {{ i + 1 }} {{ combo.approximate ? '(aproximada)' : '' }}</strong>
            <span class="combo-total">{{ pesos(combo.totalMinor) }}</span>
          </div>
          <ul class="combo-items">
            <li v-for="item in combo.items" :key="item.id" class="combo-item">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-cost">{{ pesos(item.estimatedCostMinor) }}</span>
            </li>
          </ul>
        </AppCard>
      </div>
    </div>

    <!-- Ajustes de Presupuesto (Sección secundaria al final) -->
    <div class="budget-settings neu">
      <details>
        <summary class="settings-summary">
          <span>Ajustar presupuesto mensual</span>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 9l-7 7-7-7"/></svg>
        </summary>
        <form class="form" @submit.prevent="saveBudget">
          <div class="grid-2">
            <label class="field"><span>Mes</span><input v-model="period" type="month" required /></label>
            <label class="field"><span>Monto disponible</span><input v-model="amount" inputmode="decimal" required placeholder="0" /></label>
          </div>
          <button class="btn btn-primary submit-btn" type="submit">Guardar cambios</button>
        </form>
      </details>
    </div>
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

const progress = computed(() => {
  if (available.value <= 0) return 0
  return Math.min(100, (spent.value / available.value) * 100)
})

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
.budget-view {
  display: grid;
  gap: 20px;
}
@media (min-width: 768px) {
  .budget-view {
    grid-template-columns: 1.2fr 1fr;
    align-items: start;
    gap: 24px;
  }
  .head {
    grid-column: 1 / -1;
  }
  .budget-hero {
    position: sticky;
    top: 40px;
    grid-column: 1;
    grid-row: 2 / 4;
  }
  .suggestions-section {
    grid-column: 2;
  }
  .budget-settings {
    grid-column: 2;
  }
}
.head h2 {
  font-family: var(--display);
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0;
}

.budget-hero {
  padding: 24px 20px;
  background: var(--surface);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
}
.budget-hero.over-budget {
  border-color: var(--danger);
}
.hero-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.hero-amount {
  font-family: var(--display);
  font-size: 2.8rem;
  font-weight: 700;
  font-style: italic;
  margin: 8px 0 16px;
  line-height: 1;
  color: var(--text);
}
.budget-hero.over-budget .hero-amount {
  color: var(--danger);
}

.progress-container {
  width: 100%;
  height: 8px;
  background: var(--inset);
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 20px;
  border: 1px solid var(--border);
}
.progress-bar {
  height: 100%;
  background: var(--ok);
  border-radius: 999px;
  transition: width 0.3s ease;
}
.progress-bar.danger {
  background: var(--danger);
}

.budget-summary {
  display: flex;
  width: 100%;
  justify-content: space-around;
  align-items: center;
}
.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.summary-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
}
.summary-value {
  font-size: 1.1rem;
  font-weight: 700;
}
.summary-divider {
  width: 1px;
  height: 24px;
  background: var(--border);
}

.suggestions-section h3 {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 12px;
}
.empty-suggestions {
  font-size: 0.95rem;
}
.combos-list {
  display: grid;
  gap: 12px;
}
.combo-card {
  padding: 14px 16px;
}
.combo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.05rem;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
}
.combo-total {
  font-weight: 700;
  color: var(--accent);
}
.combo-items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 6px;
}
.combo-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
}
.combo-item .item-name {
  color: var(--text);
}
.combo-item .item-cost {
  color: var(--muted);
  font-weight: 600;
}

/* Ajustes de presupuesto */
.budget-settings {
  background: var(--surface);
  border-radius: var(--radius);
  overflow: hidden;
}
.settings-summary {
  padding: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  list-style: none;
}
.settings-summary::-webkit-details-marker {
  display: none;
}
.settings-summary .chevron {
  width: 20px;
  height: 20px;
  color: var(--muted);
  transition: transform 0.2s ease;
}
details[open] .settings-summary .chevron {
  transform: rotate(180deg);
}
.form {
  padding: 0 16px 16px;
  display: grid;
  gap: 12px;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.submit-btn {
  min-height: 44px;
}
</style>
