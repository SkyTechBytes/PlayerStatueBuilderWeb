import type { SchematicDocument } from '../domain/schematic'
import { gzipNbt, stateTag } from './minecraft-common'
import { NBT } from './nbt'

export function createStructureNbt(schematic: SchematicDocument): Uint8Array {
  return gzipNbt(NBT.compound({
    DataVersion: NBT.int(schematic.minecraftDataVersion),
    size: NBT.list(3, [schematic.size.x, schematic.size.y, schematic.size.z].map(NBT.int)),
    palette: NBT.list(10, schematic.palette.map((entry) => stateTag(entry.state))),
    blocks: NBT.list(10, schematic.blocks.map((block) => NBT.compound({
      pos: NBT.list(3, [block.x, block.y, block.z].map(NBT.int)),
      state: NBT.int(block.palette),
    }))),
    entities: NBT.list(10, []),
  }))
}