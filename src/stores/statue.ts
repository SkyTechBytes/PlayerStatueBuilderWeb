import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import type { ColorMode } from '../domain/color-distance'
import { createDemoSkin } from '../domain/demo-skin'
import { fetchPublicSkin } from '../domain/player-skin'
import { createSchematicDocument } from '../domain/schematic'
import { recordStatueDownload } from '../domain/telemetry'
import { generateStatue, type RasterImage } from '../domain/statue-generator'
import type { PaletteFamily } from '../domain/palette'
import type { SkinModel, SkinModelChoice } from '../domain/skin-layout'
import type { BlockId, VoxelMap } from '../domain/voxel-model'
import { exportSchematic, type ExporterId, type ExportOptions } from '../exporters'

interface StatueState {
  playerName?: string
  sourceName: string
  sourceImage: RasterImage
  sourceModelHint: SkinModel | null
  modelChoice: SkinModelChoice
  detectedModel: SkinModel
  outerLayer: boolean
  colorMode: ColorMode
  families: Set<PaletteFamily>
  voxels: VoxelMap
  error: string
  lookupLoading: boolean
}

export const useStatueStore = defineStore('statue', {
  state: (): StatueState => ({
    playerName: undefined,
    sourceName: 'Built-in sample',
    sourceImage: markRaw(createDemoSkin()),
    sourceModelHint: null,
    modelChoice: 'auto',
    detectedModel: 'classic',
    outerLayer: true,
    colorMode: 'lab',
    families: new Set<PaletteFamily>(['wool', 'planks', 'terracotta', 'concrete', 'glass']),
    voxels: new Map(),
    error: '',
    lookupLoading: false,
  }),

  getters: {
    blockTotals(state): Array<{ block: BlockId; color: string; count: number }> {
      const totals = new Map<BlockId, { color: string; count: number }>()
      for (const voxel of state.voxels.values()) {
        const current = totals.get(voxel.block)
        totals.set(voxel.block, { color: voxel.color, count: (current?.count ?? 0) + 1 })
      }
      return [...totals.entries()]
        .map(([block, total]) => ({ block, ...total }))
        .sort((left, right) => right.count - left.count)
    },
  },

  actions: {
    regenerate() {
      try {
        const result = generateStatue(this.sourceImage, {
          model: this.modelChoice === 'auto' && this.sourceImage.height === 32
            ? (this.sourceModelHint ?? 'classic')
            : this.modelChoice,
          outerLayer: this.outerLayer,
          families: this.families,
          colorMode: this.colorMode,
        })
        this.detectedModel = result.model
        this.voxels = result.voxels
        this.error = ''
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Could not generate the statue'
      }
    },

    setModel(model: SkinModelChoice) {
      this.modelChoice = model
      this.regenerate()
    },

    setOuterLayer(visible: boolean) {
      this.outerLayer = visible
      this.regenerate()
    },

    setColorMode(mode: ColorMode) {
      this.colorMode = mode
      this.regenerate()
    },

    toggleFamily(family: PaletteFamily) {
      if (this.families.has(family)) {
        if (this.families.size === 1) return
        this.families.delete(family)
      } else {
        this.families.add(family)
      }
      this.regenerate()
    },

    async loadSkin(file: File, modelHint: SkinModel | null = null) {
      this.playerName = undefined
      try {
        const bitmap = await createImageBitmap(file)
        if (bitmap.width !== 64 || (bitmap.height !== 64 && bitmap.height !== 32)) {
          bitmap.close()
          throw new Error('Choose a 64 x 64 or legacy 64 x 32 Minecraft skin PNG')
        }
        const canvas = document.createElement('canvas')
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('Canvas is not available in this browser')
        context.drawImage(bitmap, 0, 0)
        bitmap.close()

        this.sourceImage = markRaw(context.getImageData(0, 0, canvas.width, canvas.height))
        this.sourceModelHint = modelHint
        this.sourceName = file.name
        this.regenerate()
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Could not read that image'
      }
    },

    async loadPlayerSkin(rawUsername: string) {
      const username = rawUsername.trim()
      this.playerName = undefined
      this.lookupLoading = true
      this.error = ''
      try {
        const publicSkin = await fetchPublicSkin(username)
        const skin = new File([publicSkin.blob], `${username}.png`, { type: 'image/png' })
        await this.loadSkin(skin)
        if (!this.error) {
          this.playerName = rawUsername
          this.sourceName = `${username}'s skin`
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Could not retrieve that player skin'
      } finally {
        this.lookupLoading = false
      }
    },

    resetDemo() {
      this.playerName = undefined
      this.sourceName = 'Built-in sample'
      this.sourceImage = markRaw(createDemoSkin())
      this.sourceModelHint = null
      this.modelChoice = 'auto'
      this.outerLayer = true
      this.colorMode = 'lab'
      this.families = new Set(['wool', 'planks', 'terracotta', 'concrete', 'glass'])
      this.regenerate()
    },

    async runExport(id: ExporterId, options?: ExportOptions, partIndex = 0): Promise<'downloaded' | 'copied' | null> {
      try {
        const schematic = createSchematicDocument(this.detectedModel, this.voxels.values())
        const artifact = exportSchematic(schematic, id, options)
        if (artifact.delivery === 'clipboard') {
          const text = Array.isArray(artifact.data) ? artifact.data[partIndex] : artifact.data
          if (typeof text !== 'string') throw new Error('Clipboard export part is missing or is not text')
          await navigator.clipboard.writeText(text)
        } else {
          if (Array.isArray(artifact.data)) throw new Error('Download exports must produce a single file')
          download(artifact.filename, artifact.data, artifact.mime)
        }
        void recordStatueDownload(schematic, this.playerName)
        this.error = ''
        return artifact.delivery === 'clipboard' ? 'copied' : 'downloaded'
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Could not export that format'
        return null
      }
    },
  },
})

function download(filename: string, content: string | Uint8Array, type: string): void {
  const body = typeof content === 'string'
    ? content
    : content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) as ArrayBuffer
  const url = URL.createObjectURL(new Blob([body], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
