<template>
  <AppModal :open="Boolean(item) && mode === 'menu'" :title="item?.name || 'Acciones'" @close="$emit('close')">
    <div v-if="item" class="sheet">
      <p v-if="item.estimatedCostMinor" class="muted meta">{{ pesos(item.estimatedCostMinor, item.currency) }}</p>
      <a v-if="item.referenceUrl" class="btn btn-primary sheet-btn" :href="item.referenceUrl" target="_blank" rel="noopener noreferrer">
        Abrir en {{ describeLink(item.referenceUrl).label }}
      </a>
      <button class="btn sheet-btn" type="button" @click="mode = 'edit'">Editar</button>
      <button class="btn sheet-btn" type="button" @click="mode = 'move'">Mover a otra lista</button>
      <button v-if="item.status !== 'comprado'" class="btn sheet-btn" type="button" @click="registerPurchase">Registrar compra con precio</button>
      <button class="btn btn-danger sheet-btn" type="button" @click="archive">Archivar</button>
    </div>
  </AppModal>

  <ItemForm :open="Boolean(item) && mode === 'edit'" :item="item" :list-id="item?.listId ?? null" @close="done" />

  <ListPicker
    :open="Boolean(item) && mode === 'move'"
    title="Mover a…"
    :current="item?.listId ?? null"
    include-inbox
    @close="done"
    @pick="move"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppModal from '../ui/AppModal.vue'
import ListPicker from '../ListPicker.vue'
import ItemForm from '../../features/items/ItemForm.vue'
import type { Item } from '../../db/types'
import { describeLink } from '../../utils/links'
import { pesos } from '../../utils/money'
import { moveItemToList, remove } from '../../features/lists/actions'

const props = defineProps<{ item: Item | null }>()
const emit = defineEmits<{ close: [] }>()
const router = useRouter()
const mode = ref<'menu' | 'edit' | 'move'>('menu')

watch(() => props.item?.id, () => { mode.value = 'menu' })

function done() {
  mode.value = 'menu'
  emit('close')
}

async function move(listId: string | null) {
  if (props.item) await moveItemToList(props.item, listId)
  done()
}

async function archive() {
  if (!props.item) return
  if (!confirm(`¿Archivar "${props.item.name}"?`)) return
  await remove('item', 'items', props.item.id)
  done()
}

function registerPurchase() {
  if (!props.item) return
  const id = props.item.id
  done()
  router.push({ path: '/compras', query: { itemId: id } })
}
</script>

<style scoped>
.sheet {
  display: grid;
  gap: 10px;
  padding: 8px 0;
}
.meta { margin: 0; font-weight: 700; }
.sheet-btn {
  width: 100%;
  justify-content: center;
  min-height: 48px;
  font-size: 1rem;
  text-decoration: none;
}
</style>
