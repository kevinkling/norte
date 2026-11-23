<template>
  <section class="page budget">
    <div class="hero card" :class="{ over: remaining < 0 }">
      <span class="hero-label">Restante este mes</span>
      <strong class="hero-amount">{{ pesos(remaining) }}</strong>
      <div class="bar" role="progressbar" :aria-valuenow="Math.round(progress)" aria-valuemin="0" aria-valuemax="100" aria-label="Gastado del mes">
        <div class="bar-fill" :style="{ width: `${progress}%` }"></div>
      </div>
      <div class="hero-split">
        <div><span class="hero-label">Disponible</span><span class="hero-num">{{ pesos(available) }}</span></div>
        <div><span class="hero-label">Gastado</span><span class="hero-num">{{ pesos(spent) }}</span></div>
      </div>
    </div>

    <div class="section suggestions">
      <h2 class="sec-h">Sugerencias de compra</h2>
      <p v-if="!combos.length" class="hint">
        No hay combinaciones que entren en el presupuesto con ítems deseados o planificados.
      </p>
      <div v-for="(combo, i) in combos" v-else :key="i" class="group">
        <div class="list-row combo-head">
          <span class="row-main row-title">Opción {{ i + 1 }}<span v-if="combo.approximate" class="muted"> · aproximada</span></span>
          <span class="row-end">{{ pesos(combo.totalMinor) }}</span>
        </div>
        <div v-for="item in combo.items" :key="item.id" class="list-row combo-item">
          <span class="row-main">{{ item.name }}</span>
          <span class="row-end muted">{{ pesos(item.estimatedCostMinor) }}</span>
        </div>
      </div>
    </div>

    <details class="group settings">
      <summary class="list-row">
        <span class="row-icon"><AppIcon name="pencil" :size="18" /></span>
        <span class="row-main row-title">Ajustar presupuesto mensual</span>
        <AppIcon class="row-chevron caret" name="chevron-down" :size="16" />
      </summary>
      <form class="form settings-form" @submit.prevent="saveBudget">
        <div class="grid-2">
          <label class="field"><span>Mes</span><input v-model="period" type="month" required /></label>
          <label class="field"><span>Monto disponible</span><input v-model="amount" inputmode="decimal" required placeholder="0" /></label>
        </div>
        <div class="form-actions"><button class="btn btn-primary" type="submit">Guardar</button></div>
      </form>
    </details>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '../../components/ui/AppIcon.vue'
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
.hero {
  display: grid;
  gap: var(--sp-3);
  padding: var(--sp-5) var(--sp-4) var(--sp-4);
  text-align: center;
}
.hero-label {
  display: block;
  font-size: var(--fs-xs);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.hero-amount {
  font-family: var(--display);
  font-size: var(--fs-2xl);
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.over .hero-amount { color: var(--danger); }
.bar { height: 6px; border-radius: var(--r-pill); background: var(--inset); overflow: hidden; }
.bar-fill { height: 100%; border-radius: inherit; background: var(--accent); transition: width 0.3s ease; }
.over .bar-fill { background: var(--danger); }
.hero-split { display: grid; grid-template-columns: 1fr 1fr; }
.hero-split > div + div { border-left: 1px solid var(--border); }
.hero-num { font-weight: 600; font-variant-numeric: tabular-nums; }
.suggestions .group + .group { margin-top: var(--sp-2); }
.combo-head { min-height: 44px; background: color-mix(in srgb, var(--inset) 40%, var(--surface)); }
.combo-head .row-end { color: var(--accent); }
.combo-item { min-height: 40px; font-size: var(--fs-sm); }
.combo-item .row-end { font-weight: 500; }
.settings summary { list-style: none; cursor: pointer; margin-top: -1px; }
.settings summary::-webkit-details-marker { display: none; }
.settings .caret { transition: transform var(--ease); }
.settings[open] .caret { transform: rotate(180deg); }
.settings-form { padding: var(--sp-2) var(--sp-3) var(--sp-3); }
@media (min-width: 900px) {
  .budget { grid-template-columns: 1fr 1fr; align-items: start; }
  .hero { grid-row: span 2; }
}
</style>
