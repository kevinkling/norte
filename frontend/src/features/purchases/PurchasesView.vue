<template>
  <section class="purchases-view">
    <header class="head">
      <h2>Historial de compras</h2>
    </header>

    <div class="purchases-list">
      <AppCard v-for="row in rows" :key="row.id" class="purchase-card">
        <div class="purchase-info">
          <strong class="item-name">{{ itemName(row.itemId) }}</strong>
          <p class="purchase-meta">
            <span class="date">{{ formatDate(row.purchasedOn) }}</span>
            <span class="bullet">·</span>
            <span class="price">{{ pesos(row.paidAmountMinor, row.currency) }}</span>
          </p>
          <p v-if="row.notes" class="notes muted">{{ row.notes }}</p>
        </div>
        <button class="icon-btn delete-btn" type="button" aria-label="Archivar" @click="handleRemove(row)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </AppCard>
    </div>

    <p v-if="!rows.length" class="empty-state muted">
      No hay compras registradas.
    </p>

    <!-- FAB Nueva compra -->
    <button class="fab" type="button" aria-label="Nueva compra" @click="openNew">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
    </button>

    <!-- Modal de Registro de Compra -->
    <AppModal :open="open" title="Registrar compra" @close="open = false">
      <form class="form" @submit.prevent="save">
        <label class="field"><span>Ítem</span>
          <select v-model="form.itemId" required>
            <option disabled value="">Elegí un ítem</option>
            <option v-for="i in itemOptions" :key="i.id" :value="i.id">{{ i.name }}</option>
          </select>
        </label>
        <div class="grid-2">
          <label class="field"><span>Fecha</span><input v-model="form.purchasedOn" type="date" required /></label>
          <label class="field"><span>Precio pagado</span><input v-model="form.paid" inputmode="decimal" required placeholder="0" /></label>
        </div>
        <label class="field"><span>Notas</span><textarea v-model="form.notes" placeholder="Detalles de la compra..."></textarea></label>
        <label class="field file-field">
          <span>Fotos</span>
          <input type="file" accept="image/*" multiple @change="onFiles" />
        </label>
        <button class="btn btn-primary submit-btn" type="submit">Guardar</button>
      </form>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppCard from '../../components/ui/AppCard.vue'
import AppModal from '../../components/ui/AppModal.vue'
import { dataTick } from '../../app/bus'
import { db } from '../../db/norte.db'
import { newId, nowIso } from '../../db/ids'
import { mutateDomain } from '../../db/mutate'
import { savePhoto } from '../../db/photos'
import type { Item, Purchase } from '../../db/types'
import { parsePesos, pesos } from '../../utils/money'

const purchases = ref<Purchase[]>([])
const items = ref<Item[]>([])
const open = ref(false)
const files = ref<File[]>([])
const route = useRoute()
const form = reactive({ itemId: '', purchasedOn: nowIso().slice(0, 10), paid: '', notes: '' })

const rows = computed(() => purchases.value.filter((p) => !p.deletedAt).sort((a, b) => b.purchasedOn.localeCompare(a.purchasedOn)))
const itemOptions = computed(() => items.value.filter((i) => !i.deletedAt))
function itemName(id: string) { return items.value.find((i) => i.id === id)?.name ?? 'Ítem' }

function formatDate(ymd: string) {
  try {
    const [y, m, d] = ymd.split('-')
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    return date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ymd
  }
}

async function reload() {
  purchases.value = await db.purchases.toArray()
  items.value = await db.items.toArray()
}
watch(dataTick, reload, { immediate: true })
watch(() => route.query.itemId, (id) => {
  if (typeof id === 'string' && id) {
    form.itemId = id
    open.value = true
  }
}, { immediate: true })

function openNew() { files.value = []; open.value = true }
function onFiles(e: Event) { files.value = [...((e.target as HTMLInputElement).files ?? [])] }

async function save() {
  const id = newId()
  const rec: Purchase = {
    id, itemId: form.itemId, purchasedOn: form.purchasedOn,
    paidAmountMinor: parsePesos(form.paid), currency: 'ARS', notes: form.notes,
    createdAt: nowIso(), updatedAt: nowIso(), deletedAt: null, revision: 0,
  }
  await mutateDomain({ entityType: 'purchase', entityId: id, operation: 'upsert', table: 'purchases', record: rec as unknown as Record<string, unknown> })
  const item = items.value.find((i) => i.id === form.itemId)
  if (item && item.status !== 'comprado') {
    await mutateDomain({ entityType: 'item', entityId: item.id, operation: 'upsert', table: 'items', record: { ...item, status: 'comprado', orderScope: `items:${item.area}:comprado` } as unknown as Record<string, unknown> })
  }
  for (const [i, file] of files.value.entries()) {
    await savePhoto({ file, role: i === 0 ? 'cover' : 'photo', purchaseId: id, position: (i + 1) * 1024 })
  }
  open.value = false
}

async function handleRemove(purchase: Purchase) {
  if (confirm(`¿Seguro que querés archivar la compra de "${itemName(purchase.itemId)}"?`)) {
    await remove(purchase.id)
  }
}

async function remove(id: string) {
  await mutateDomain({ entityType: 'purchase', entityId: id, operation: 'delete', table: 'purchases', record: { id } })
}
</script>

<style scoped>
.purchases-view {
  display: grid;
  gap: 16px;
}
.head h2 {
  font-family: var(--display);
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0;
}

.purchases-list {
  display: grid;
  gap: 10px;
}
.purchase-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
}
.purchase-info {
  display: grid;
  gap: 4px;
}
.item-name {
  font-size: 1.05rem;
  font-weight: 650;
}
.purchase-meta {
  margin: 0;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 6px;
}
.date {
  color: var(--muted);
}
.bullet {
  color: var(--border);
}
.price {
  font-weight: 700;
  color: var(--text);
}
.notes {
  margin: 4px 0 0;
  font-size: 0.85rem;
}

.icon-btn {
  width: 44px;
  height: 44px;
  border: 0;
  background: transparent;
  color: var(--muted);
  border-radius: 12px;
  display: grid;
  place-items: center;
}
.icon-btn:active {
  background: var(--inset);
  color: var(--text);
}
.delete-btn:active {
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 10%, transparent);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  font-size: 0.95rem;
}

/* Formulario */
.form {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.submit-btn {
  margin-top: 8px;
  min-height: 48px;
  font-size: 1.05rem;
}
</style>
