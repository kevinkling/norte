<template>
  <section class="page">
    <div v-if="rows.length" class="group">
      <div v-for="row in rows" :key="row.id" class="list-row">
        <span class="row-main">
          <span class="row-title">{{ itemName(row.itemId) }}</span>
          <span class="row-meta">
            <span>{{ formatDate(row.purchasedOn) }}</span>
            <span v-if="row.notes">{{ row.notes }}</span>
          </span>
        </span>
        <span class="row-end">{{ pesos(row.paidAmountMinor, row.currency) }}</span>
        <button class="icon-btn is-muted" type="button" :aria-label="`Archivar compra de ${itemName(row.itemId)}`" title="Archivar" @click="handleRemove(row)">
          <AppIcon name="archive" :size="18" />
        </button>
      </div>
    </div>

    <p v-else class="empty-state">No hay compras registradas.</p>

    <button class="fab" type="button" aria-label="Nueva compra" @click="openNew">
      <AppIcon name="plus" :size="24" :stroke="2.2" />
    </button>

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
        <label class="field"><span>Notas</span><textarea v-model="form.notes" placeholder="Detalles de la compra…"></textarea></label>
        <label class="field"><span>Fotos</span><input type="file" accept="image/*" multiple @change="onFiles" /></label>
        <div class="form-actions"><button class="btn btn-primary" type="submit">Guardar</button></div>
      </form>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { askConfirm } from '../../app/confirm'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '../../components/ui/AppIcon.vue'
import AppModal from '../../components/ui/AppModal.vue'
import { dataTick } from '../../app/bus'
import { db } from '../../db/norte.db'
import { itemScope, newId, nowIso } from '../../db/ids'
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
    await mutateDomain({ entityType: 'item', entityId: item.id, operation: 'upsert', table: 'items', record: { ...item, status: 'comprado', orderScope: itemScope(item.listId, 'comprado') } as unknown as Record<string, unknown> })
  }
  for (const [i, file] of files.value.entries()) {
    await savePhoto({ file, role: i === 0 ? 'cover' : 'photo', purchaseId: id, position: (i + 1) * 1024 })
  }
  open.value = false
}

async function handleRemove(purchase: Purchase) {
  if (await askConfirm(`¿Seguro que querés archivar la compra de "${itemName(purchase.itemId)}"?`, { confirmLabel: 'Archivar' })) {
    await remove(purchase.id)
  }
}

async function remove(id: string) {
  await mutateDomain({ entityType: 'purchase', entityId: id, operation: 'delete', table: 'purchases', record: { id } })
}
</script>
