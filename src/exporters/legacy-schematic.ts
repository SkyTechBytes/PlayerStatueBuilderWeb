import type { SchematicDocument } from '../domain/schematic'
import { gzipNbt } from './minecraft-common'
import { NBT } from './nbt'

const COLORS: Record<string, number> = {
  white: 0, orange: 1, magenta: 2, light_blue: 3, yellow: 4, lime: 5, pink: 6, gray: 7,
  light_gray: 8, cyan: 9, purple: 10, blue: 11, brown: 12, green: 13, red: 14, black: 15,
}
const PLANKS: Record<string, number> = { oak: 0, spruce: 1, birch: 2, jungle: 3, acacia: 4, dark_oak: 5, mangrove: 3 }

function legacyBlock(state: string): readonly [number, number] {
  const name = state.replace(/^minecraft:/, '').replace(/\[.*$/, '')
  if (name === 'stone') return [1, 0]
  if (name === 'terracotta') return [172, 0]
  if (name.endsWith('_planks')) return [5, PLANKS[name.slice(0, -7)] ?? 0]
  for (const [suffix, id] of [['_stained_glass', 95], ['_terracotta', 159], ['_concrete', 251], ['_wool', 35]] as const) {
    if (name.endsWith(suffix)) return [id, COLORS[name.slice(0, -suffix.length)] ?? 0]
  }
  throw new Error(`${state} cannot be represented by the legacy .schematic format`)
}

export function createLegacySchematic(schematic: SchematicDocument): Uint8Array {
  const volume = schematic.size.x * schematic.size.y * schematic.size.z
  const blocks = new Uint8Array(volume)
  const data = new Uint8Array(volume)
  for (const block of schematic.blocks) {
    const state = schematic.palette[block.palette]?.state
    if (!state) throw new Error(`Block references missing palette index ${block.palette}`)
    const [id, metadata] = legacyBlock(state)
    const index = block.x + block.z * schematic.size.x + block.y * schematic.size.x * schematic.size.z
    blocks[index] = id
    data[index] = metadata
  }
  return gzipNbt(NBT.compound({
    Width: NBT.short(schematic.size.x), Height: NBT.short(schematic.size.y), Length: NBT.short(schematic.size.z),
    Materials: NBT.string('Alpha'), Blocks: NBT.byteArray(blocks), Data: NBT.byteArray(data),
    Entities: NBT.list(10, []), TileEntities: NBT.list(10, []),
    WEOriginX: NBT.int(0), WEOriginY: NBT.int(0), WEOriginZ: NBT.int(0),
    WEOffsetX: NBT.int(0), WEOffsetY: NBT.int(0), WEOffsetZ: NBT.int(0),
  }), 'Schematic')
}