<script setup lang="ts">
import { ref } from 'vue'
import { useStatueStore } from '../stores/statue'

const store = useStatueStore()
const input = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const playerName = ref('')

function chooseFile() {
  input.value?.click()
}

function receive(files: FileList | null) {
  dragging.value = false
  const file = files?.[0]
  if (file) void store.loadSkin(file)
}

function loadPlayer() {
  if (playerName.value.trim()) void store.loadPlayerSkin(playerName.value)
}
</script>

<template>
  <section class="tool-section">
    <div class="section-heading">
      <div>
        <span class="step">01</span>
        <h2>Skin source</h2>
      </div>
      <button class="quiet-button" type="button" @click="store.resetDemo">Reset</button>
    </div>

    <label class="field-label player-label" for="player-name">Minecraft player</label>
    <form class="player-lookup" @submit.prevent="loadPlayer">
      <input
        id="player-name"
        v-model="playerName"
        class="text-input"
        autocomplete="off"
        maxlength="16"
        placeholder="Player name"
      >
      <button type="submit" :disabled="store.lookupLoading || !playerName.trim()">
        {{ store.lookupLoading ? 'Loading...' : 'Load' }}
      </button>
    </form>
    <small v-if="store.error" class="source-error" role="alert">{{ store.error }}</small>

    <div class="source-divider"><span>or upload PNG</span></div>

    <button
      class="drop-zone"
      :class="{ dragging }"
      type="button"
      @click="chooseFile"
      @dragenter.prevent="dragging = true"
      @dragover.prevent
      @dragleave.prevent="dragging = false"
      @drop.prevent="receive($event.dataTransfer?.files ?? null)"
    >
      <span class="upload-mark" aria-hidden="true">+</span>
      <span class="drop-copy">
        <strong>{{ store.sourceName }}</strong>
        <small>Drop a 64 x 64 or legacy 64 x 32 PNG</small>
      </span>
    </button>
    <input ref="input" class="visually-hidden" type="file" accept="image/png" @change="receive(($event.target as HTMLInputElement).files)">
  </section>
</template>
