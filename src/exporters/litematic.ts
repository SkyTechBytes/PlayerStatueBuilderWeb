import type { SchematicDocument } from '../domain/schematic'
import { denseVolume, gzipNbt, packBlockStates, stateTag } from './minecraft-common'
import { NBT } from './nbt'

export function createLitematic(schematic: SchematicDocument): Uint8Array {
  const volume = denseVolume(schematic)
  const now = BigInt(Date.now())
  const size = NBT.compound({ x: NBT.int(schematic.size.x), y: NBT.int(schematic.size.y), z: NBT.int(schematic.size.z) })
  const region = NBT.compound({
    Position: NBT.compound({ x: NBT.int(0), y: NBT.int(0), z: NBT.int(0) }),
    Size: size,
    BlockStatePalette: NBT.list(10, volume.palette.map(stateTag)),
    BlockStates: NBT.longArray(packBlockStates(volume.indices, volume.palette.length)),
    TileEntities: NBT.list(10, []),
    Entities: NBT.list(10, []),
    PendingBlockTicks: NBT.list(10, []),
    PendingFluidTicks: NBT.list(10, []),
  })
  return gzipNbt(NBT.compound({
    Version: NBT.int(6),
    SubVersion: NBT.int(1),
    MinecraftDataVersion: NBT.int(schematic.minecraftDataVersion),
    Metadata: NBT.compound({
      Name: NBT.string('player-statue'),
      Author: NBT.string('Player Statue Builder Web'),
      Description: NBT.string('Generated player statue'),
      RegionCount: NBT.int(1),
      TotalVolume: NBT.long(schematic.size.x * schematic.size.y * schematic.size.z),
      TotalBlocks: NBT.long(schematic.blocks.length),
      EnclosingSize: size,
      TimeCreated: NBT.long(now),
      TimeModified: NBT.long(now),
    }),
    Regions: NBT.compound({ Statue: region }),
  }))
}