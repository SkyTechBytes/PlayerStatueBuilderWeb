<script setup lang="ts">
import type { ColorMode } from '../domain/color-distance'
import type { PaletteFamily } from '../domain/palette'
import type { SkinModelChoice } from '../domain/skin-layout'
import { useStatueStore } from '../stores/statue'

const store = useStatueStore()
const models: Array<{ value: SkinModelChoice; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'classic', label: 'Classic' },
  { value: 'slim', label: 'Slim' },
]
const families: Array<{ value: PaletteFamily; label: string }> = [
  { value: 'wool', label: 'Wool' },
  { value: 'planks', label: 'Planks' },
  { value: 'terracotta', label: 'Terracotta' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'glass', label: 'Stained glass' },
  { value: 'gray', label: 'Grayscale' },
]
const colorModes: Array<{ value: ColorMode; label: string }> = [
  { value: 'lab', label: 'LAB (default)' },
  { value: 'rgb', label: 'RGB' },
  { value: 'absrgb', label: 'Absolute RGB' },
  { value: 'hsb', label: 'HSB' },
  { value: 'hsl', label: 'HSL' },
]
</script>

<template>
  <section class="tool-section">
    <div class="section-heading">
      <div>
        <span class="step">02</span>
        <h2>Build rules</h2>
      </div>
      <span class="detected">{{ store.detectedModel }} model</span>
    </div>

    <span class="field-label">Arm model</span>
    <div class="segmented" role="group" aria-label="Arm model">
      <button
        v-for="model in models"
        :key="model.value"
        type="button"
        :class="{ active: store.modelChoice === model.value }"
        @click="store.setModel(model.value)"
      >{{ model.label }}</button>
    </div>

    <label class="toggle-row">
      <span>
        <strong>Outer skin layer</strong>
        <small>Hat, jacket, sleeves, and trousers</small>
      </span>
      <input
        type="checkbox"
        :checked="store.outerLayer"
        @change="store.setOuterLayer(($event.target as HTMLInputElement).checked)"
      >
    </label>

    <label class="field-label" for="color-mode">Color matching</label>
    <select
      id="color-mode"
      class="text-input"
      :value="store.colorMode"
      @change="store.setColorMode(($event.target as HTMLSelectElement).value as ColorMode)"
    >
      <option v-for="mode in colorModes" :key="mode.value" :value="mode.value">{{ mode.label }}</option>
    </select>

    <span class="field-label">Allowed blocks</span>
    <div class="family-list">
      <label v-for="family in families" :key="family.value" class="family-row">
        <input
          type="checkbox"
          :checked="store.families.has(family.value)"
          @change="store.toggleFamily(family.value)"
        >
        <span class="family-swatch" :class="family.value" aria-hidden="true"></span>
        <span>{{ family.label }}</span>
      </label>
    </div>
  </section>
</template>
