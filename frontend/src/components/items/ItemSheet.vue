<template>
  <AppModal :open="Boolean(item) && mode === 'menu'" :title="item?.name || 'Acciones'" @close="$emit('close')">
    <div v-if="item" class="sheet">
      <ItemGallery :item-id="item.id" />
      <p v-if="item.estimatedCostMinor" class="sheet-meta">{{ pesos(item.estimatedCostMinor, item.currency) }}</p>
      <div class="group">
        <a v-if="item.referenceUrl" class="list-row" :href="item.referenceUrl" target="_blank" rel="noopener noreferrer">
          <span class="row-icon"><AppIcon name="external" :size="18" /></span>
          <span class="row-main row-title">Abrir en {{ describeLink(item.referenceUrl).label }}</span>
        </a>
        <button class="list-row" type="button" @click="mode = 'edit'">
          <span class="row-icon"><AppIcon name="pencil" :size="18" /></span>
          <span class="row-main row-title">Editar</span>
        </button>
        <button class="list-row" type="button" @click="mode = 'move'">
          <span class="row-icon"><AppIcon name="move" :size="18" /></span>
          <span class="row-main row-title">Mover a otra lista</span>
        </button>
        <button v-if="item.status !== 'comprado'" class="list-row" type="button" @click="registerPurchase">
          <span class="row-icon"><AppIcon name="receipt" :size="18" /></span>
          <span class="row-main row-title">Registrar compra con precio</span>
        </button>
        <button class="list-row is-danger" type="button" @click="archive">
          <span class="row-icon"><AppIcon name="trash" :size="18" /></span>
          <span class="row-main row-title">Eliminar</span>
        </button>
      </div>
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
import { askConfirm } from '../../app/confirm'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../ui/AppIcon.vue'
import AppModal from '../ui/AppModal.vue'
import ListPicker from '../ListPicker.vue'
import ItemGallery from './ItemGallery.vue'
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
  if (!await askConfirm(`¿Eliminar "${props.item.name}"?`, { confirmLabel: 'Eliminar' })) return
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
.sheet { display: grid; gap: var(--sp-3); }
.sheet-meta { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--muted); }
.sheet-meta:first-child { margin-top: calc(-1 * var(--sp-2)); }
</style>
