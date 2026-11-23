<template>
  <form class="quick-add" @submit.prevent="submit">
    <div class="segmented" role="group" aria-label="Tipo">
      <button type="button" :aria-pressed="kind === 'buy'" @click="kind = 'buy'">🛒 Comprar</button>
      <button type="button" :aria-pressed="kind === 'do'" @click="kind = 'do'">✅ Hacer</button>
    </div>
    <div class="composer">
      <input
        ref="input"
        v-model="text"
        :placeholder="kind === 'buy' ? 'Agregar algo o pegar un link…' : 'Ej. Limpiar la PC'"
        :aria-label="kind === 'buy' ? 'Agregar algo para comprar' : 'Agregar algo para hacer'"
        enterkeyhint="done"
        autocomplete="off"
      />
      <button class="icon-btn is-fill" type="submit" :disabled="!text.trim()" aria-label="Agregar">
        <AppIcon name="plus" :size="18" :stroke="2.2" />
      </button>
    </div>
    <p v-if="linkHint" class="hint">Se guarda como link de {{ linkHint }}</p>
  </form>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '../../components/ui/AppIcon.vue'
import { describeLink, extractUrl } from '../../utils/links'
import { createItem, createTask } from './actions'

const props = withDefaults(defineProps<{ listId: string | null; defaultKind?: 'buy' | 'do' }>(), { defaultKind: 'buy' })
const kind = ref<'buy' | 'do'>(props.defaultKind)
const text = ref('')
const pending = ref(0)
const input = ref<HTMLInputElement | null>(null)

const url = computed(() => extractUrl(text.value))
const linkHint = computed(() => (url.value ? describeLink(url.value).label : ''))

async function submit() {
  const value = text.value.trim()
  if (!value) return
  // Se vacía enseguida para poder anotar lo siguiente mientras se guarda esto.
  const link = url.value
  const mode = kind.value
  text.value = ''
  input.value?.focus()
  pending.value += 1
  try {
    if (link) {
      const name = value.replace(link, '').trim()
      await createItem({ name: name || undefined, listId: props.listId, url: link })
    } else if (mode === 'buy') {
      await createItem({ name: value, listId: props.listId })
    } else {
      await createTask({ title: value, listId: props.listId })
    }
  } catch (err) {
    if (!text.value) text.value = value
    throw err
  } finally {
    pending.value -= 1
  }
}
</script>

<style scoped>
.quick-add { display: grid; gap: var(--sp-3); justify-items: start; }
.quick-add .composer { width: 100%; }
</style>
