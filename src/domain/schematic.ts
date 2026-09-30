import type { SkinModel } from './skin-layout'
import { getBounds, type BlockId, type Bounds, type Voxel } from './voxel-model'

export interface SchematicPaletteEntry {
  state: BlockId
  color: string
  opacity: number
}

export interface SchematicBlock {
  x: number
  y: number
  z: number
  palette: number
}

export interface SchematicDocument {
  format: 'psb-schematic'
  version: 1
  minecraftDataVersion: number
  size: Bounds
  palette: SchematicPaletteEntry[]
  blocks: SchematicBlock[]
  metadata: {
    model: SkinModel
    generator: 'Player Statue Builder Web'
  }
}

export function createSchematicDocument(model: SkinModel, voxels: Iterable<Voxel>): SchematicDocument {
  const sorted = [...voxels].sort((left, right) => left.y - right.y || left.z - right.z || left.x - right.x)
  const entries = new Map<BlockId, SchematicPaletteEntry>()
  for (const voxel of sorted) {
    if (!entries.has(voxel.block)) entries.set(voxel.block, {
      state: voxel.block,
      color: voxel.color,
      opacity: voxel.block.endsWith('_stained_glass') ? 0.46 : 1,
    })
  }
  const palette = [...entries.values()]
  const indices = new Map(palette.map((entry, index) => [entry.state, index]))

  return {
    format: 'psb-schematic',
    version: 1,
    minecraftDataVersion: 4189,
    size: getBounds(sorted),
    palette,
    blocks: sorted.map((voxel) => ({
      x: voxel.x,
      y: voxel.y,
      z: voxel.z,
      palette: indices.get(voxel.block)!,
    })),
    metadata: { model, generator: 'Player Statue Builder Web' },
  }
}