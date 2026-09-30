<script setup lang="ts">
import { onMounted } from 'vue'
import ExportPanel from './components/ExportPanel.vue'
import PaletteEditor from './components/PaletteEditor.vue'
import SkinInput from './components/SkinInput.vue'
import StatueCount from './components/StatueCount.vue'
import StatueViewport from './components/StatueViewport.vue'
import { useStatueStore } from './stores/statue'

const store = useStatueStore()
onMounted(() => store.regenerate())
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-copy">
        <strong>Player Statue Builder Web</strong>
      </div>
      <div class="topbar-status">
        <span>Java Edition</span>
        <StatueCount />
      </div>
    </header>

    <main class="workspace">
      <aside class="inspector">
        <SkinInput />
        <PaletteEditor />
      </aside>
      <StatueViewport />
      <aside class="output-panel">
        <ExportPanel />
      </aside>
    </main>
  </div>
</template>
