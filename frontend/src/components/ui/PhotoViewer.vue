<template>
  <Teleport to="body">
    <div v-if="open" class="viewer" role="dialog" aria-modal="true" aria-label="Fotos">
      <header class="viewer-head">
        <span v-if="photos.length > 1" class="viewer-count">{{ current + 1 }} / {{ photos.length }}</span>
        <button ref="closeBtn" class="icon-btn viewer-close" type="button" aria-label="Cerrar" @click="$emit('close')">
          <AppIcon name="x" />
        </button>
      </header>

      <div ref="track" class="viewer-track" @scroll="onScroll" @click.self="$emit('close')">
        <figure v-for="(url, i) in photos" :key="url" class="viewer-slide" @click.self="$emit('close')">
          <img :src="url" :alt="`Foto ${i + 1} de ${photos.length}`" />
        </figure>
      </div>

      <template v-if="photos.length > 1">
        <button class="icon-btn viewer-nav is-prev" type="button" aria-label="Foto anterior" :disabled="current === 0" @click="go(current - 1)">
          <AppIcon name="chevron-left" />
        </button>
        <button class="icon-btn viewer-nav is-next" type="button" aria-label="Foto siguiente" :disabled="current === photos.length - 1" @click="go(current + 1)">
          <AppIcon name="chevron-right" />
        </button>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'

/** Visor a pantalla completa: se pasa de foto deslizando, con las flechas o con el teclado. */
const props = defineProps<{ open: boolean; photos: string[]; start?: number }>()
const emit = defineEmits<{ close: [] }>()

const track = ref<HTMLElement | null>(null)
const closeBtn = ref<HTMLButtonElement | null>(null)
const current = ref(0)

function go(i: number, smooth = true) {
  const el = track.value
  if (!el) return
  const target = Math.max(0, Math.min(props.photos.length - 1, i))
  el.scrollTo({ left: target * el.clientWidth, behavior: smooth ? 'smooth' : 'instant' })
  current.value = target
}

function onScroll() {
  const el = track.value
  if (el && el.clientWidth) current.value = Math.round(el.scrollLeft / el.clientWidth)
}

// En captura y frenando la propagación: así Esc cierra solo el visor y no la hoja que está debajo.
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
  else if (e.key === 'ArrowLeft') go(current.value - 1)
  else if (e.key === 'ArrowRight') go(current.value + 1)
  else return
  e.preventDefault()
  e.stopImmediatePropagation()
}

watch(() => props.open, async (open) => {
  if (!open) {
    window.removeEventListener('keydown', onKey, true)
    return
  }
  window.addEventListener('keydown', onKey, true)
  await nextTick()
  go(props.start ?? 0, false)
  closeBtn.value?.focus()
}, { immediate: true })

onUnmounted(() => window.removeEventListener('keydown', onKey, true))
</script>

<style scoped>
.viewer {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: var(--photo-bg);
  color: var(--photo-on);
}
.viewer .icon-btn { color: var(--photo-on); background: var(--photo-btn); }
.viewer .icon-btn:disabled { opacity: .45; }
.viewer-head {
  position: absolute;
  inset: 0 0 auto;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: calc(var(--sp-3) + env(safe-area-inset-top, 0px)) var(--sp-3) var(--sp-3) var(--sp-4);
}
.viewer-close { margin-left: auto; }
.viewer-count { font-size: var(--fs-sm); font-weight: 600; font-variant-numeric: tabular-nums; }
.viewer-track {
  display: flex;
  height: 100%;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  overscroll-behavior: contain;
  scrollbar-width: none;
}
.viewer-track::-webkit-scrollbar { display: none; }
.viewer-slide {
  flex: 0 0 100%;
  margin: 0;
  display: grid;
  place-items: center;
  padding: calc(var(--sp-6) * 2) var(--sp-3);
  scroll-snap-align: center;
  scroll-snap-stop: always;
}
.viewer-slide img {
  max-width: 100%;
  max-height: calc(100dvh - var(--sp-6) * 4);
  object-fit: contain;
  border-radius: var(--r-sm);
}
.viewer-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: none;
}
.viewer-nav.is-prev { left: var(--sp-4); }
.viewer-nav.is-next { right: var(--sp-4); }
/* En pantallas con puntero se muestran las flechas; en el celular se desliza. */
@media (hover: hover) { .viewer-nav { display: inline-grid; } }
@media (prefers-reduced-motion: reduce) { .viewer-track { scroll-behavior: auto; } }
</style>
