<script setup lang="ts">
import { computed, ref } from 'vue'
import { SCHEMATIC_EXPORTERS, type ExporterId } from '../exporters'
import { useStatueStore } from '../stores/statue'

const store = useStatueStore()
const selectedOutput = ref<ExporterId>('command-block')
const selectedExporter = computed(() => SCHEMATIC_EXPORTERS.find((exporter) => exporter.id === selectedOutput.value)!)
const commandCopied = ref(false)

async function exportOutput(): Promise<void> {
  commandCopied.value = await store.runExport(selectedOutput.value) === 'copied'
  if (commandCopied.value) window.setTimeout(() => { commandCopied.value = false }, 2000)
}
</script>

<template>
  <section class="tool-section export-section">
    <div class="section-heading">
      <div>
        <span class="step">03</span>
        <h2>Export</h2>
      </div>
      <strong class="block-count">{{ store.voxels.size.toLocaleString() }} blocks</strong>
    </div>

    <div class="export-actions">
      <label class="field-label" for="export-format">Output format</label>
      <select id="export-format" v-model="selectedOutput" class="text-input" @change="commandCopied = false">
        <option v-for="exporter in SCHEMATIC_EXPORTERS" :key="exporter.id" :value="exporter.id">
          {{ exporter.label }} ({{ exporter.delivery === 'clipboard' ? 'clipboard' : exporter.extension }})
        </option>
      </select>
      <button type="button" class="primary-button" :disabled="!store.voxels.size" @click="exportOutput">
        {{ commandCopied ? 'Copied' : selectedExporter.delivery === 'clipboard' ? 'Copy command' : `Download ${selectedExporter.extension}` }}
      </button>
    </div>

    <div class="material-heading">
      <span>Material list</span>
      <span>{{ store.blockTotals.length }} types</span>
    </div>
    <div class="material-list">
      <div v-for="item in store.blockTotals" :key="item.block" class="material-row">
        <span class="block-swatch" :style="{ background: item.color }"></span>
        <span class="material-name">{{ item.block.replace('minecraft:', '').replaceAll('_', ' ') }}</span>
        <span>{{ item.count }}</span>
      </div>
    </div>
  </section>
</template>
