<template>
  <button :class="['btn', variant === 'primary' ? 'btn-primary' : '', variant === 'danger' ? 'btn-danger' : '']" v-bind="$attrs">
    <slot />
  </button>
</template>
<script setup lang="ts">
defineProps<{ variant?: 'primary' | 'danger' | 'default' }>()
</script>
