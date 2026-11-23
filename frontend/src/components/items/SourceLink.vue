<template>
  <a
    class="source-link no-drag"
    :data-source="info.source"
    :href="url"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="`Abrir en ${info.label}`"
    @click.stop
  >
    <span class="src-dot" aria-hidden="true"></span>
    <span class="label">{{ info.label }}</span>
    <AppIcon name="external" :size="11" :stroke="2.2" />
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '../ui/AppIcon.vue'
import { describeLink } from '../../utils/links'

const props = defineProps<{ url: string }>()
const info = computed(() => describeLink(props.url))
</script>

<style scoped>
/* Va dentro de .row-meta: mismo tamaño y color que el resto del meta. */
.source-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  max-width: 100%;
  color: inherit;
  text-decoration: none;
}
.source-link:hover .label { text-decoration: underline; }
.source-link[data-source='instagram'] .src-dot { background: #c13584; }
.source-link[data-source='pinterest'] .src-dot { background: #e60023; }
.source-link[data-source='mercadolibre'] .src-dot { background: #e5c700; }
.label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
