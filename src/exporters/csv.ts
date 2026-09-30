import type { SchematicDocument } from '../domain/schematic'

export function createCsv(schematic: SchematicDocument): string {
  const rows = schematic.blocks.map((block) => {
    const entry = schematic.palette[block.palette]
    if (!entry) throw new Error(`Block references missing palette index ${block.palette}`)
    return `${block.x},${block.y},${block.z},${entry.state},${entry.color}`
  })
  return ['x,y,z,block_state,color', ...rows, ''].join('\n')
}