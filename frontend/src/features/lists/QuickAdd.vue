<template>
  <form class="quick-add neu" @submit.prevent="submit">
    <div class="kind" role="group" aria-label="Tipo">
      <button type="button" :aria-pressed="kind === 'buy'" @click="kind = 'buy'">🛒 Comprar</button>
      <button type="button" :aria-pressed="kind === 'do'" @click="kind = 'do'">✅ Hacer</button>
    </div>
    <div class="row">
      <input
        ref="input"
        v-model="text"
        :placeholder="kind === 'buy' ? 'Ej. Memoria RAM, o pegá un link…' : 'Ej. Limpiar la PC'"
        :aria-label="kind === 'buy' ? 'Agregar algo para comprar' : 'Agregar algo para hacer'"
        enterkeyhint="done"
        autocomplete="off"
      />
      <button class="btn btn-primary" type="submit" :disabled="!text.trim()" aria-label="Agregar">Agregar</button>
    </div>
    <p v-if="linkHint" class="hint muted">Se guarda como link de {{ linkHint }}</p>
  </form>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
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
.quick-add {
  display: grid;
  gap: 10px;
  padding: 12px;
}
.kind {
  display: flex;
  gap: 6px;
}
.kind button {
  flex: 1;
  min-height: 38px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--inset);
  color: var(--muted);
  font-weight: 700;
  font-size: 0.9rem;
}
.kind button[aria-pressed='true'] {
  background: var(--text);
  border-color: var(--text);
  color: var(--surface);
}
.row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}
.row input {
  min-height: 46px;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text);
  padding: 0 14px;
  font: inherit;
  font-size: 1rem;
}
.row input:focus {
  outline: 2px solid var(--focus);
  outline-offset: 1px;
}
.row .btn {
  min-height: 46px;
}
.hint {
  margin: 0;
  font-size: 0.82rem;
}
</style>
