<template>
  <section>
    <header class="head">
      <h2>Inspiración</h2>
      <button class="btn btn-primary" type="button" @click="open = true">Nueva captura</button>
    </header>
    <div class="chip-row">
      <button class="chip" type="button" :aria-pressed="area === 'casa'" @click="area = 'casa'">Casa</button>
      <button class="chip" type="button" :aria-pressed="area === 'auto'" @click="area = 'auto'">Auto</button>
    </div>
    <SortableList :items="visible" :index="selected" @update:items="reorder" @select="selected = $event" @move="nudge">
      <template #item="{ element }">
        <AppCard>
          <img v-if="cover(element.id)" :src="cover(element.id)" :alt="element.title || 'Captura de inspiración'" class="shot" />
          <p v-else class="muted">Sin captura local todavía</p>
          <strong>{{ element.title || element.externalUrl }}</strong>
          <div class="chip-row">
            <a class="btn" :href="element.externalUrl" target="_blank" rel="noopener noreferrer">Abrir link</a>
            <button class="btn btn-danger" type="button" @click="remove(element.id)">Archivar</button>
          </div>
        </AppCard>
      </template>
    </SortableList>
    <AppModal :open="open" title="Nueva inspiración" @close="open = false">
      <form @submit.prevent="save">
        <label class="field"><span>Título</span><input v-model="form.title" /></label>
        <label class="field"><span>Área</span>
          <select v-model="form.area"><option value="casa">Casa</option><option value="auto">Auto</option></select>
        </label>
        <label class="field"><span>Link de Instagram o Pinterest</span><input v-model="form.externalUrl" type="url" required /></label>
        <label class="field"><span>Captura (obligatoria)</span><input type="file" accept="image/*" required @change="onFile" /></label>
        <p class="muted">No se descarga metadata ni se incrusta el reel. Solo se guarda tu captura y el link.</p>
        <button class="btn btn-primary" type="submit">Guardar</button>
      </form>
    </AppModal>
  </section>
</template>
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppCard from '../../components/ui/AppCard.vue'
import AppModal from '../../components/ui/AppModal.vue'
import SortableList from '../../components/SortableList.vue'
import { dataTick } from '../../app/bus'
import { db } from '../../db/norte.db'
import { inspirationScope, newId, nowIso } from '../../db/ids'
import { mutateDomain } from '../../db/mutate'
import { objectUrl, savePhoto } from '../../db/photos'
import type { Area, Attachment, Inspiration } from '../../db/types'
import { needsRebalance, positionAfter, positionForMove, rebalancePositions } from '../../utils/position'

const area = ref<Area>('casa')
const open = ref(false)
const selected = ref(-1)
const rows = ref<Inspiration[]>([])
const photos = ref<Attachment[]>([])
const file = ref<File | null>(null)
const urls = ref<Record<string, string>>({})
const form = reactive({ title: '', area: 'casa' as Area, externalUrl: '' })

const visible = computed(() =>
  rows.value.filter((r) => !r.deletedAt && r.area === area.value).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)),
)
function cover(id: string) { return urls.value[id] || '' }

watch(dataTick, async () => {
  rows.value = await db.inspirations.toArray()
  photos.value = await db.attachments.toArray()
  const next: Record<string, string> = {}
  for (const att of photos.value.filter((a) => a.inspirationId && a.data && !a.deletedAt)) {
    next[att.inspirationId!] = objectUrl(att.data)
  }
  urls.value = next
}, { immediate: true })

function onFile(e: Event) { file.value = (e.target as HTMLInputElement).files?.[0] ?? null }

async function save() {
  if (!file.value) return
  const id = newId()
  const rec: Inspiration = {
    id, area: form.area, categoryId: null, title: form.title, notes: '',
    externalUrl: form.externalUrl, orderScope: inspirationScope(form.area),
    position: positionAfter(visible.value.at(-1)?.position),
    createdAt: nowIso(), updatedAt: nowIso(), deletedAt: null, revision: 0,
  }
  await mutateDomain({ entityType: 'inspiration', entityId: id, operation: 'upsert', table: 'inspirations', record: rec as unknown as Record<string, unknown> })
  await savePhoto({ file: file.value, role: 'cover', inspirationId: id })
  open.value = false
  file.value = null
}
async function remove(id: string) {
  await mutateDomain({ entityType: 'inspiration', entityId: id, operation: 'delete', table: 'inspirations', record: { id } })
}
async function reorder(next: Inspiration[]) {
  const movedIndex = next.findIndex((row, i) => row.id !== visible.value[i]?.id)
  if (movedIndex < 0) return
  const moved = next[movedIndex]
  const pos = positionForMove(next, movedIndex)
  await mutateDomain({ entityType: 'inspiration', entityId: moved.id, operation: 'upsert', table: 'inspirations', record: { ...moved, position: pos } as unknown as Record<string, unknown> })
  if (needsRebalance(next.map((x, i) => (i === movedIndex ? pos : x.position)))) {
    for (const row of rebalancePositions(next)) {
      const it = next.find((x) => x.id === row.id)
      if (it) await mutateDomain({ entityType: 'inspiration', entityId: it.id, operation: 'upsert', table: 'inspirations', record: { ...it, position: row.position } as unknown as Record<string, unknown> })
    }
  }
}
async function nudge(delta: number) {
  const i = selected.value
  if (i < 0) return
  const arr = [...visible.value]
  const j = i + delta
  if (j < 0 || j >= arr.length) return
  const [row] = arr.splice(i, 1)
  arr.splice(j, 0, row)
  selected.value = j
  await reorder(arr)
}
</script>
<style scoped>
.head { display: flex; justify-content: space-between; align-items: center; }
.shot { width: 100%; border-radius: 12px; max-height: 220px; object-fit: cover; border: 1px solid var(--border); }
</style>
