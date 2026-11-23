<template>
  <AppModal :open="open" :title="item ? 'Editar' : 'Nuevo para comprar'" @close="$emit('close')">
    <form class="form" @submit.prevent="save">
      <div class="chips">
        <select v-model="form.listId" class="chip-select" aria-label="Lista">
          <option :value="null">📥 Bandeja</option>
          <option v-for="l in lists" :key="l.id" :value="l.id">{{ listLabel(l) }}</option>
        </select>
        <select v-model="form.categoryId" class="chip-select" aria-label="Categoría">
          <option :value="null">Sin categoría</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <label class="field"><span>Nombre</span><input v-model="form.name" required placeholder="Ej. Memoria RAM 16 GB" /></label>
      <div class="tabs" role="tablist" aria-label="Secciones del ítem">
        <button class="tab" type="button" role="tab" :aria-selected="tab === 'datos'" @click="tab = 'datos'">Datos</button>
        <button class="tab" type="button" role="tab" :aria-selected="tab === 'links'" @click="tab = 'links'">
          Links<span v-if="linkCount" class="tab-count">{{ linkCount }}</span>
        </button>
      </div>

      <div v-if="tab === 'links'" class="links-panel" role="tabpanel">
        <div v-for="(link, i) in form.links" :key="i" class="link-card">
          <div class="link-fields field">
            <input v-model="link.url" type="url" inputmode="url" placeholder="https://… (Instagram, Mercado Libre…)" aria-label="URL" />
            <input v-model="link.title" placeholder="Título (opcional)" aria-label="Título del link" />
          </div>
          <button class="btn-danger-icon" type="button" aria-label="Quitar link" @click="form.links.splice(i, 1)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <button class="btn add-link-btn" type="button" @click="form.links.push({ id: '', title: '', url: '' })">+ Agregar link</button>
      </div>

      <template v-else>
      <div class="grid-2">
        <label class="field"><span>Precio estimado</span><input v-model="form.cost" inputmode="decimal" placeholder="Opcional" /></label>
        <label class="field"><span>Mes objetivo</span><input v-model="form.targetMonth" type="month" /></label>
      </div>
      <label class="check-row"><input v-model="form.bought" type="checkbox" /> <span>Ya lo compré</span></label>

      <div class="extra">
        <fieldset v-if="tags.length" class="field tags-fieldset">
          <legend>Etiquetas</legend>
          <div class="tags-grid">
            <label v-for="t in tags" :key="t.id" class="check-row">
              <input v-model="form.tagIds" type="checkbox" :value="t.id" />
              <span>{{ t.name }}</span>
            </label>
          </div>
        </fieldset>
        <label class="field"><span>Notas</span><textarea v-model="form.description" placeholder="Modelo, medidas, dónde lo vi…"></textarea></label>
        <div class="photo-field">
          <span class="photo-title">Fotos</span>
          <div class="photo-box">
            <div v-if="gallery.length" class="photo-grid">
              <figure v-for="(g, i) in gallery" :key="g.key" class="photo-item">
                <img :src="g.url" alt="Foto del ítem" />
                <button class="photo-remove" type="button" aria-label="Quitar foto" @click="removeThumb(i)">×</button>
              </figure>
            </div>
            <p v-if="undownloaded" class="muted photo-hint">
              {{ undownloaded }} {{ undownloaded === 1 ? 'foto todavía no se descargó' : 'fotos todavía no se descargaron' }} en este dispositivo.
            </p>
            <div class="photo-actions">
              <label class="btn photo-btn">
                Elegir archivos
                <input class="sr-only" type="file" accept="image/*" multiple @change="onFile" />
              </label>
              <button class="btn photo-btn" type="button" @click="pasteFromClipboard">Pegar imagen</button>
            </div>
            <p class="muted photo-hint">{{ photoMsg || 'Podés agregar todas las que quieras. También podés pegar con Ctrl+V.' }}</p>
          </div>
        </div>
      </div>
      </template>

      <button class="btn btn-primary submit-btn" type="submit">Guardar</button>
      <button v-if="item" class="btn btn-danger delete-btn" type="button" @click="deleteItem">Eliminar ítem</button>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import { askConfirm } from '../../app/confirm'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import AppModal from '../../components/ui/AppModal.vue'
import { db } from '../../db/norte.db'
import { itemScope, newId, nowIso } from '../../db/ids'
import { mutateDomain } from '../../db/mutate'
import { savePhoto } from '../../db/photos'
import type { Attachment, Category, Item, List, Tag } from '../../db/types'
import { parsePesos } from '../../utils/money'
import { listLabel, liveLists, nextPosition, remove, syncItemLinks, syncItemTags, type LinkDraft } from '../lists/actions'

const props = defineProps<{ open: boolean; item: Item | null; listId: string | null }>()
const emit = defineEmits<{ close: []; saved: [Item] }>()

const lists = ref<List[]>([])
const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])
// Galería del formulario: fotos ya guardadas (con id) + fotos nuevas (con file) todavía sin guardar.
type Thumb = { key: string; url: string; id?: string; file?: File }
const gallery = ref<Thumb[]>([])
const existingRows = ref<Attachment[]>([])
const removedIds = ref<string[]>([])
const tab = ref<'datos' | 'links'>('datos')
const linkCount = computed(() => form.links.filter((l) => l.url.trim()).length)
const photoMsg = ref('')
const undownloaded = computed(() =>
  existingRows.value.filter((a) => !a.data && !removedIds.value.includes(a.id)).length,
)
const form = reactive({
  name: '',
  listId: null as string | null,
  cost: '',
  targetMonth: '',
  bought: false,
  categoryId: null as string | null,
  tagIds: [] as string[],
  description: '',
  links: [] as LinkDraft[],
})

watch(() => props.open, async (open) => {
  if (!open) return
  photoMsg.value = ''
  tab.value = 'datos'
  await loadPhotos(props.item)
  lists.value = await liveLists()
  categories.value = (await db.categories.toArray()).filter((c) => !c.deletedAt).sort((a, b) => a.position - b.position)
  tags.value = (await db.tags.toArray()).filter((t) => !t.deletedAt).sort((a, b) => a.position - b.position)
  const item = props.item
  if (!item) {
    Object.assign(form, {
      name: '', listId: props.listId, cost: '', targetMonth: '', bought: false,
      categoryId: null, tagIds: [], description: '', links: [{ id: '', title: '', url: '' }],
    })
    return
  }
  const links = (await db.inspirations.where('itemId').equals(item.id).toArray())
    .filter((r) => !r.deletedAt)
    .sort((a, b) => a.position - b.position)
    .map((r) => ({ id: r.id, title: r.title, url: r.externalUrl }))
  if (!links.length && item.referenceUrl) links.push({ id: '', title: '', url: item.referenceUrl })
  const tagIds = (await db.itemTags.where('itemId').equals(item.id).toArray()).filter((r) => !r.deletedAt).map((r) => r.tagId)
  Object.assign(form, {
    name: item.name,
    listId: item.listId,
    cost: item.estimatedCostMinor ? String(item.estimatedCostMinor / 100) : '',
    targetMonth: item.targetMonth ?? '',
    bought: item.status === 'comprado',
    categoryId: item.categoryId,
    tagIds,
    description: item.description,
    links: links.length ? links : [{ id: '', title: '', url: '' }],
  })
}, { immediate: true })

function revokeGallery() {
  for (const g of gallery.value) URL.revokeObjectURL(g.url)
}

async function loadPhotos(item: Item | null) {
  revokeGallery()
  gallery.value = []
  existingRows.value = []
  removedIds.value = []
  if (!item) return
  const rows = (await db.attachments.where('itemId').equals(item.id).toArray())
    .filter((a) => !a.deletedAt)
    .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt))
  existingRows.value = rows
  gallery.value = rows
    .filter((a) => a.data)
    .map((a) => ({ key: a.id, id: a.id, url: URL.createObjectURL(a.data as Blob) }))
}

function addFiles(files: File[]) {
  for (const file of files) {
    gallery.value.push({ key: newId(), file, url: URL.createObjectURL(file) })
  }
}

function removeThumb(i: number) {
  const [gone] = gallery.value.splice(i, 1)
  if (!gone) return
  if (gone.id) removedIds.value.push(gone.id)
  URL.revokeObjectURL(gone.url)
}

function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  addFiles(Array.from(input.files ?? []).filter((f) => f.type.startsWith('image/')))
  photoMsg.value = ''
  input.value = ''
}

function imagesFromFiles(files: ArrayLike<File> | null | undefined): File[] {
  return Array.from(files ?? []).filter((f) => f.type.startsWith('image/'))
}

// Ctrl+V con el formulario abierto: si el portapapeles trae imágenes, se suman a las fotos.
// Si trae solo texto, se deja pegar normal en el campo donde estés.
function onPaste(e: ClipboardEvent) {
  if (!props.open) return
  const files = imagesFromFiles(e.clipboardData?.files)
  if (!files.length) return
  e.preventDefault()
  addFiles(files)
  photoMsg.value = files.length > 1 ? `${files.length} imágenes pegadas.` : 'Imagen pegada.'
}

// Botón "Pegar imagen" (sirve en el celular, donde no hay Ctrl+V).
async function pasteFromClipboard() {
  photoMsg.value = ''
  if (!navigator.clipboard?.read) {
    photoMsg.value = 'Este navegador no deja leer imágenes con el botón. Usá Ctrl+V.'
    return
  }
  try {
    for (const entry of await navigator.clipboard.read()) {
      const type = entry.types.find((t) => t.startsWith('image/'))
      if (!type) continue
      const blob = await entry.getType(type)
      addFiles([new File([blob], `pegada.${type.split('/')[1] || 'png'}`, { type })])
      photoMsg.value = 'Imagen pegada.'
      return
    }
    photoMsg.value = 'No hay ninguna imagen en el portapapeles.'
  } catch (err) {
    const name = err instanceof Error ? err.name : 'Error'
    photoMsg.value = name === 'NotAllowedError'
      ? 'El navegador bloqueó el acceso al portapapeles. Permitilo en el candado de la barra de direcciones, o usá Ctrl+V.'
      : `No se pudo leer el portapapeles (${name}). Usá Ctrl+V o elegí un archivo.`
  }
}

onMounted(() => document.addEventListener('paste', onPaste))
onBeforeUnmount(() => {
  document.removeEventListener('paste', onPaste)
  revokeGallery()
})

async function deleteItem() {
  const item = props.item
  if (!item || !await askConfirm(`¿Eliminar "${item.name}"?`, { confirmLabel: 'Eliminar' })) return
  await remove('item', 'items', item.id)
  emit('close')
}

async function save() {
  const links = form.links.filter((l) => l.url.trim())
  const status = form.bought ? 'comprado' : 'deseado'
  const scope = itemScope(form.listId, status)
  const base: Item = props.item ?? {
    id: newId(), area: null, listId: form.listId, name: '', categoryId: null, description: '',
    estimatedCostMinor: null, currency: 'ARS', priority: 3, targetMonth: null, status: 'deseado',
    referenceUrl: '', orderScope: '', position: 0, createdAt: nowIso(), updatedAt: nowIso(), deletedAt: null, revision: 0,
  }
  const rec: Item = {
    ...base,
    name: form.name.trim(),
    listId: form.listId,
    categoryId: form.categoryId,
    description: form.description,
    estimatedCostMinor: form.cost ? parsePesos(form.cost) : null,
    targetMonth: form.targetMonth || null,
    status,
    referenceUrl: links[0]?.url.trim() ?? '',
    orderScope: scope,
    position: props.item?.orderScope === scope ? props.item.position : await nextPosition('items', scope),
    updatedAt: nowIso(),
  }
  await mutateDomain({ entityType: 'item', entityId: rec.id, operation: 'upsert', table: 'items', record: rec as unknown as Record<string, unknown> })
  await syncItemLinks(rec, links)
  await syncItemTags(rec.id, form.tagIds)
  for (const id of removedIds.value) await remove('attachment', 'attachments', id)
  const kept = existingRows.value.filter((r) => !removedIds.value.includes(r.id))
  let hasCover = kept.some((r) => r.role === 'cover')
  let position = Math.max(0, ...kept.map((r) => r.position)) + 1024
  for (const g of gallery.value) {
    if (!g.file) continue
    await savePhoto({ file: g.file, role: hasCover ? 'photo' : 'cover', itemId: rec.id, position })
    hasCover = true
    position += 1024
  }
  emit('saved', rec)
  emit('close')
}
</script>

<style scoped>
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
.links-fieldset, .tags-fieldset {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 14px;
}
.link-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
.link-row input {
  min-height: 40px;
  min-width: 0;
}
.btn-danger-icon {
  width: 40px;
  height: 40px;
  border: 1px solid var(--danger);
  color: var(--danger);
  border-radius: 10px;
  background: transparent;
  display: grid;
  place-items: center;
}
.add-link-btn {
  min-height: 40px;
  font-size: 0.85rem;
  border-style: dashed;
  width: 100%;
}
.check-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  font-size: 0.95rem;
}
.check-row input {
  width: 20px;
  height: 20px;
  accent-color: var(--accent);
}
.tags-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 4px;
}
.extra {
  display: grid;
  gap: 12px;
}
/* Cápsula chica arriba de todo; el select nativo se mantiene (accesible y cómodo en móvil). */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.form .chip-select {
  width: auto;
  max-width: 100%;
  height: 32px;
  min-height: 0;
  padding: 0 28px 0 12px;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
  background-color: var(--surface-2, rgb(231, 224, 211));
  cursor: pointer;
}
.photo-field { display: grid; gap: 6px; }
.photo-title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.photo-box { display: grid; gap: 8px; }
.photo-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.photo-item { position: relative; margin: 0; }
.photo-item img {
  display: block;
  height: 88px;
  width: 88px;
  object-fit: cover;
  border-radius: 12px;
}
.photo-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 0;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}
.photo-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.photo-btn { min-height: 36px; cursor: pointer; }
.photo-hint { margin: 0; font-size: 0.8125rem; }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}
.delete-btn {
  min-height: 44px;
  justify-content: center;
}
.tabs {
  display: flex;
  gap: 6px;
  border-bottom: 1px solid var(--border);
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 14px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.tab[aria-selected='true'] {
  color: var(--text);
  border-bottom-color: var(--accent);
}
.tab-count {
  min-width: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--inset);
  font-size: 0.75rem;
  line-height: 20px;
  text-align: center;
}
.links-panel { display: grid; gap: 10px; }
.link-card {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: start;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
}
.link-fields { display: grid; gap: 8px; }
.submit-btn {
  margin-top: 4px;
  min-height: 48px;
  font-size: 1.05rem;
}
</style>
