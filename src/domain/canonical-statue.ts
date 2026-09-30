import type { SchematicBlock, SchematicDocument } from './schematic'
import type { BlockId, Bounds } from './voxel-model'

export interface CanonicalStatueBlock {
  x: number
  y: number
  z: number
  state: BlockId
}

export interface CanonicalStatue {
  format: 'psb-statue'
  version: 1
  size: Bounds
  blocks: CanonicalStatueBlock[]
}

export function createCanonicalStatue(schematic: SchematicDocument): CanonicalStatue {
  const blocks = schematic.blocks
    .map((block) => expandBlock(schematic, block))
    .sort((left, right) => (
      left.x - right.x
      || left.y - right.y
      || left.z - right.z
      || left.state.localeCompare(right.state)
    ))

  return {
    format: 'psb-statue',
    version: 1,
    size: boundsOf(blocks),
    blocks,
  }
}

export function serializeCanonicalStatue(schematic: SchematicDocument): string {
  return JSON.stringify(createCanonicalStatue(schematic))
}

function expandBlock(schematic: SchematicDocument, block: SchematicBlock): CanonicalStatueBlock {
  const state = schematic.palette[block.palette]?.state
  if (!state) throw new Error(`Block references missing palette entry ${block.palette}`)
  return { x: block.x, y: block.y, z: block.z, state }
}

function boundsOf(blocks: readonly CanonicalStatueBlock[]): Bounds {
  let x = 0
  let y = 0
  let z = 0

  for (const block of blocks) {
    x = Math.max(x, block.x + 1)
    y = Math.max(y, block.y + 1)
    z = Math.max(z, block.z + 1)
  }

  return { x, y, z }
}