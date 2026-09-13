<template>
  <section>
    <header class="head">
      <h2>Historial de compras</h2>
      <button class="btn btn-primary" type="button" @click="openNew">Nueva compra</button>
    </header>
    <AppCard v-for="row in rows" :key="row.id" class="gap">
      <strong>{{ itemName(row.itemId) }}</strong>
      <p>{{ row.purchasedOn }} · {{ pesos(row.paidAmountMinor, row.currency) }}</p>
      <p v-if="row.notes" class="muted">{{ row.notes }}</p>
      <button class="btn btn-danger" type="button" @click="remove(row.id)">Archivar</button>
    </AppCard>

    <AppModal :open="open" title="Registrar compra" @close="open = false">
      <form @submit.prevent="save">
        <label class="field"><span>Ítem</span>
          <select v-model="form.itemId" required>
            <option disabled value="">Elegí un ítem</option>
            <option v-for="i in itemOptions" :key="i.id" :value="i.id">{{ i.name }}</option>
          </select>
        </label>
        <label class="field"><span>Fecha</span><input v-model="form.purchasedOn" type="date" required /></label>
        <label class="field"><span>Precio pagado</span><input v-model="form.paid" inputmode="decimal" required /></label>
        <label class="field"><span>Notas</span><textarea v-model="form.notes"></textarea></label>
        <label class="field"><span>Fotos</span><input type="file" accept="image/*" multiple @change="onFiles" /></label>
        <button class="btn btn-primary" type="submit">Guardar</button>
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
async function remove(id: string) {
  await mutateDomain({ entityType: 'purchase', entityId: id, operation: 'delete', table: 'purchases', record: { id } })
}
</script>
<style scoped>
.head { display: flex; justify-content: space-between; align-items: center; }
.gap { margin-bottom: 10px; }
</style>
