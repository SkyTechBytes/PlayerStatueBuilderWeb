<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { createSchematicDocument } from '../domain/schematic'
import { exportSchematic, SCHEMATIC_EXPORTERS, type ExporterId } from '../exporters'
import type { CommandBlockOptions, StatueOrientation } from '../exporters/command-block'
import { useStatueStore } from '../stores/statue'

const store = useStatueStore()
const selectedOutput = ref<ExporterId>('command-block')
const orientation = ref<StatueOrientation>('south')
const version = ref<NonNullable<CommandBlockOptions['version']>>('current')
const mode = ref<NonNullable<CommandBlockOptions['mode']>>('build')
const options = computed(() => ({ orientation: orientation.value, version: version.value, mode: mode.value }))
const selectedExporter = computed(() => SCHEMATIC_EXPORTERS.find((exporter) => exporter.id === selectedOutput.value)!)
const supportsCommandOptions = computed(() => 'commandOptions' in selectedExporter.value && selectedExporter.value.commandOptions)
const clipboardOutput = computed((): { commands: string[]; error: string } => {
  if (selectedExporter.value.delivery !== 'clipboard' || !store.voxels.size) return { commands: [], error: '' }
  try {
    const schematic = createSchematicDocument(store.detectedModel, store.voxels.values())
    const artifact = exportSchematic(schematic, selectedOutput.value, options.value)
    if (artifact.data instanceof Uint8Array) throw new Error('Clipboard exports must produce text')
    return { commands: Array.isArray(artifact.data) ? artifact.data : [artifact.data], error: '' }
  } catch (error) {
    return { commands: [], error: error instanceof Error ? error.message : 'Could not generate commands' }
  }
})
const copiedParts = ref(new Set<number>())
const giveCommandCopied = ref(false)
watch(clipboardOutput, () => { copiedParts.value = new Set() }, { flush: 'sync' })

async function copyGiveCommand(): Promise<void> {
  giveCommandCopied.value = false
  try {
    await navigator.clipboard.writeText('/give @p minecraft:command_block')
    giveCommandCopied.value = true
    store.error = ''
  } catch (error) {
    store.error = error instanceof Error ? error.message : 'Could not copy the command-block give command'
  }
}

async function exportOutput(partIndex = 0): Promise<void> {
  const output = clipboardOutput.value
  const result = await store.runExport(selectedOutput.value, options.value, partIndex)
  if (result === 'copied' && output === clipboardOutput.value) copiedParts.value.add(partIndex)
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
      <select id="export-format" v-model="selectedOutput" class="text-input">
        <option v-for="exporter in SCHEMATIC_EXPORTERS" :key="exporter.id" :value="exporter.id">
          {{ exporter.label }} ({{ exporter.delivery === 'clipboard' ? 'clipboard' : exporter.extension }})
        </option>
      </select>
      <template v-if="supportsCommandOptions">
        <button type="button" class="secondary-button" @click="copyGiveCommand">
          {{ giveCommandCopied ? 'Copied give command' : 'Copy give command block' }}
        </button>
        <p class="export-hint give-command-hint">
          <svg class="info-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 7v4" />
            <circle cx="8" cy="4.5" r=".75" fill="currentColor" stroke="none" />
          </svg>
          <span>Paste into Minecraft chat to get a command block.</span>
        </p>
        <label class="field-label" for="command-version">Minecraft Java version</label>
        <select id="command-version" v-model="version" class="text-input">
          <option value="current">26.3+</option>
          <option value="legacy">1.21.6–26.2</option>
        </select>
        <label class="field-label" for="statue-orientation">Facing</label>
        <select id="statue-orientation" v-model="orientation" class="text-input">
          <option value="south">South (default)</option>
          <option value="west">West</option>
          <option value="north">North</option>
          <option value="east">East</option>
        </select>
        <label class="field-label" for="command-mode">Mode</label>
        <select id="command-mode" v-model="mode" class="text-input">
          <option value="build">Build</option>
          <option value="undo">Undo (set area to air)</option>
        </select>
      </template>
      <template v-if="selectedExporter.delivery === 'clipboard'">
        <p v-if="clipboardOutput.error" role="alert">{{ clipboardOutput.error }}</p>
        <p v-if="clipboardOutput.commands.length" class="export-hint">
          <svg class="info-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 7v4" />
            <circle cx="8" cy="4.5" r=".75" fill="currentColor" stroke="none" />
          </svg>
          <span>Run each command in order in the same command block.</span>
        </p>
        <button
          v-for="(command, index) in clipboardOutput.commands"
          :key="index"
          type="button"
          class="primary-button"
          @click="exportOutput(index)"
        >
          {{ copiedParts.has(index) ? 'Copied' : 'Copy' }} command {{ index + 1 }}
          ({{ command.length.toLocaleString() }} chars)
        </button>
      </template>
      <button v-else type="button" class="primary-button" :disabled="!store.voxels.size" @click="exportOutput()">
        Download {{ selectedExporter.extension }}
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
