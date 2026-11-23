<template>
  <div v-if="slides.length" class="gallery" :class="{ 'is-single': slides.length === 1 }">
    <template v-for="s in slides" :key="s.id">
      <button
        v-if="s.url"
        class="gallery-slide"
        type="button"
        :aria-label="`Ver foto ${s.index + 1} en grande`"
        @click="openAt(s.index)"
      >
        <img :src="s.url" alt="" />
      </button>
      <span v-else class="gallery-slide is-missing" role="img" aria-label="Foto todavía no descargada en este dispositivo">
        <AppIcon name="image" />
      </span>
    </template>
  </div>

  <PhotoViewer :open="viewerOpen" :photos="urls" :start="start" @close="viewerOpen = false" />
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import AppIcon from '../ui/AppIcon.vue'
import PhotoViewer from '../ui/PhotoViewer.vue'
import { db } from '../../db/norte.db'
import { byGalleryOrder } from '../../db/photos'

/** Carrusel de fotos de un ítem: la portada primero y después el resto, en orden. Tocar una abre el visor. */
const props = defineProps<{ itemId: string | null }>()

type Slide = { id: string; url: string; index: number }
const slides = ref<Slide[]>([])
const viewerOpen = ref(false)
const start = ref(0)
const urls = computed(() => slides.value.filter((s) => s.url).map((s) => s.url))

function revoke() {
  for (const s of slides.value) if (s.url) URL.revokeObjectURL(s.url)
}

watch(() => props.itemId, async (itemId) => {
  revoke()
  slides.value = []
  viewerOpen.value = false
  if (!itemId) return
  const rows = (await db.attachments.where('itemId').equals(itemId).toArray())
    .filter((a) => !a.deletedAt)
    .sort(byGalleryOrder)
  if (props.itemId !== itemId) return
  let index = 0
  slides.value = rows.map((a) => (a.data
    ? { id: a.id, url: URL.createObjectURL(a.data as Blob), index: index++ }
    : { id: a.id, url: '', index: -1 }))
}, { immediate: true })

function openAt(i: number) {
  start.value = i
  viewerOpen.value = true
}

onUnmounted(revoke)
</script>

<style scoped>
/* Las fotos asoman por el costado para que se note que hay más. */
.gallery {
  display: flex;
  gap: var(--sp-2);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}
.gallery::-webkit-scrollbar { display: none; }
.gallery-slide {
  flex: 0 0 85%;
  aspect-ratio: 4 / 3;
  max-height: 280px;
  padding: 0;
  border: 0;
  border-radius: var(--r-md);
  overflow: hidden;
  background: var(--inset);
  color: var(--muted);
  display: grid;
  place-items: center;
  scroll-snap-align: start;
  cursor: zoom-in;
}
.gallery.is-single .gallery-slide { flex-basis: 100%; }
.gallery-slide img { width: 100%; height: 100%; object-fit: cover; display: block; }
.gallery-slide.is-missing { cursor: default; }
</style>
