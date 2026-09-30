<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const METRICS_ENDPOINT = 'https://psbweb.skytechbytes.workers.dev/api/metrics'
const count = ref<number | null>(null)
const label = computed(() => {
  const suffix = count.value !== null && count.value < 100 ? ' (lmao)' : ''
  return `Over ${count.value?.toLocaleString() ?? '...'} statues generated!${suffix}`
})

onMounted(async () => {
  try {
    const response = await fetch(METRICS_ENDPOINT)
    if (!response.ok) return

    const metrics: unknown = await response.json()
    if (!Array.isArray(metrics) || typeof metrics[0]?.Count !== 'number') return
    count.value = Math.max(0, Math.floor(metrics[0].Count))
  } catch {
    // Keep the loading label when metrics are unavailable.
  }
})
</script>

<template>
  <span class="statue-count" :aria-busy="count === null">{{ label }}</span>
</template>