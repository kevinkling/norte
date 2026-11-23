<template>
  <AppModal :open="open" :title="item ? 'Editar' : 'Nuevo para comprar'" @close="$emit('close')">
    <form class="form" @submit.prevent="save">
      <div class="chip-row">
        <select v-model="form.listId" class="chip" aria-label="Lista">
          <option :value="null">📥 Bandeja</option>
          <option v-for="l in lists" :key="l.id" :value="l.id">{{ listLabel(l) }}</option>
        </select>
        <select v-model="form.categoryId" class="chip" aria-label="Categoría">
          <option :value="null">Sin categoría</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <label class="field"><span>Nombre</span><input v-model="form.name" required placeholder="Ej. Memoria RAM 16 GB" /></label>

      <div class="segmented" role="tablist" aria-label="Secciones del ítem">
        <button type="button" role="tab" :aria-selected="tab === 'datos'" @click="tab = 'datos'">Datos</button>
        <button type="button" role="tab" :aria-selected="tab === 'links'" @click="tab = 'links'">
          Links<span v-if="linkCount" class="badge">{{ linkCount }}</span>
        </button>
      </div>

      <div v-if="tab === 'links'" class="links-panel" role="tabpanel">
        <div v-for="(link, i) in form.links" :key="i" class="link-row">
          <div class="link-fields">
            <input v-model="link.url" class="input" type="url" inputmode="url" placeholder="https://… (Instagram, Mercado Libre…)" aria-label="URL" />
            <input v-model="link.title" class="input" placeholder="Título (opcional)" aria-label="Título del link" />
          </div>
          <button class="icon-btn is-muted" type="button" aria-label="Quitar link" title="Quitar link" @click="form.links.splice(i, 1)">
            <AppIcon name="x" :size="18" />
          </button>
        </div>
        <div>
          <button class="btn btn-sm btn-ghost add-link" type="button" @click="form.links.push({ id: '', title: '', url: '' })">
            <AppIcon name="plus" :size="16" :stroke="2.2" />Agregar link
          </button>
        </div>
      </div>

      <template v-else>
        <div class="grid-2">
          <label class="field"><span>Precio estimado</span><input v-model="form.cost" inputmode="decimal" placeholder="Opcional" /></label>
          <label class="field"><span>Mes objetivo</span><input v-model="form.targetMonth" type="month" /></label>
        </div>
        <label class="check-row"><input v-model="form.bought" type="checkbox" /> <span>Ya lo compré</span></label>

        <fieldset v-if="tags.length" class="field">
          <legend>Etiquetas</legend>
          <div class="chip-row">
            <label v-for="t in tags" :key="t.id" class="chip tag-chip" :class="{ 'is-on': form.tagIds.includes(t.id) }">
              <input v-model="form.tagIds" class="sr-only" type="checkbox" :value="t.id" />{{ t.name }}
            </label>
          </div>
        </fieldset>
        <label class="field"><span>Notas</span><textarea v-model="form.description" placeholder="Modelo, medidas, dónde lo vi…"></textarea></label>

        <div class="field">
          <span>Fotos</span>
          <div class="photo-grid">
            <figure v-for="(g, i) in gallery" :key="g.key" class="photo">
              <img :src="g.url" alt="Foto del ítem" />
              <button class="photo-remove" type="button" aria-label="Quitar foto" @click="removeThumb(i)">
                <AppIcon name="x" :size="14" :stroke="2.4" />
              </button>
            </figure>
            <label class="photo-add" title="Elegir archivos">
              <AppIcon name="upload" />
              <span>Subir</span>
              <input class="sr-only" type="file" accept="image/*" multiple @change="onFile" />
            </label>
            <button class="photo-add" type="button" title="Pegar imagen del portapapeles" @click="pasteFromClipboard">
              <AppIcon name="clipboard" />
              <span>Pegar</span>
            </button>
          </div>
          <p v-if="undownloaded" class="hint">
            {{ undownloaded }} {{ undownloaded === 1 ? 'foto todavía no se descargó' : 'fotos todavía no se descargaron' }} en este dispositivo.
          </p>
          <p v-if="photoMsg" class="hint">{{ photoMsg }}</p>
        </div>
      </template>

      <div class="form-actions">
        <button v-if="item" class="btn btn-danger" type="button" @click="deleteItem">
          <AppIcon name="trash" :size="18" />Eliminar
        </button>
        <span class="spacer"></span>
        <button class="btn btn-primary" type="submit">Guardar</button>
      </div>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import { askConfirm } from '../../app/confirm'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import AppIcon from '../../components/ui/AppIcon.vue'
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
.segmented { justify-self: start; }
.segmented .badge { margin-left: 2px; }
.links-panel { display: grid; gap: var(--sp-3); }
.link-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--sp-1);
  align-items: start;
}
.link-fields { display: grid; gap: var(--sp-2); }
.add-link { margin-left: calc(-1 * var(--sp-3)); color: var(--accent); }
.tag-chip { display: inline-flex; align-items: center; cursor: pointer; }
.tag-chip:focus-within { outline: 2px solid var(--focus); outline-offset: 2px; }
.photo-grid { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.photo { position: relative; margin: 0; }
.photo img, .photo-add {
  display: block;
  width: 80px;
  height: 80px;
  border-radius: var(--r-md);
  object-fit: cover;
}
.photo-add {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 2px;
  border: 1px dashed var(--border);
  background: transparent;
  color: var(--muted);
  font-size: var(--fs-xs);
  font-weight: 600;
  cursor: pointer;
}
.photo-add:hover { border-color: var(--muted); color: var(--text); }
.photo-add:focus-within { outline: 2px solid var(--focus); outline-offset: 2px; }
.photo-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
}
</style>
