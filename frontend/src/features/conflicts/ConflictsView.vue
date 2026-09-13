<template>
  <section>
    <h2>Conflictos de sincronización</h2>
    <p v-if="!rows.length" class="muted">No hay conflictos pendientes.</p>
    <AppCard v-for="c in rows" :key="c.id" class="gap">
      <p><strong>{{ c.entityType }}</strong> {{ c.entityId }}</p>
      <p class="muted">{{ c.reason }}</p>
      <div class="chip-row">
        <button class="btn" type="button" @click="useRemote(c)">Usar versión del servidor</button>
        <button class="btn btn-primary" type="button" @click="useLocal(c)">Reenviar mi cambio</button>
      </div>
    </AppCard>
  </section>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import AppCard from '../../components/ui/AppCard.vue'
import { dataTick } from '../../app/bus'
import { db } from '../../db/norte.db'
import { mutateDomain } from '../../db/mutate'
import { entityTable, toCamel } from '../../sync/map'
import { scheduleSync } from '../../sync/runner'
import type { ConflictRow } from '../../db/types'

const rows = ref<ConflictRow[]>([])
watch(dataTick, async () => {
  rows.value = (await db.conflicts.toArray()).filter((c) => !c.resolution)
}, { immediate: true })

async function useRemote(c: ConflictRow) {
  const table = entityTable[c.entityType]
  const rec = toCamel<Record<string, unknown>>(c.remote)
  await db[table].put(rec as never)
  await db.conflicts.update(c.id, { resolution: 'remote' })
}
async function useLocal(c: ConflictRow) {
  const table = entityTable[c.entityType]
  const rec = { ...c.local, revision: Number(c.remote.revision ?? 0) }
  await mutateDomain({ entityType: c.entityType, entityId: c.entityId, operation: 'upsert', table, record: rec })
  await db.conflicts.update(c.id, { resolution: 'local' })
  scheduleSync(0)
}
</script>
<style scoped>
.gap { margin-bottom: 10px; }
</style>
