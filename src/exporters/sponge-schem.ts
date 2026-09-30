import type { SchematicDocument } from '../domain/schematic'
import { denseVolume, encodeVarInts, gzipNbt } from './minecraft-common'
import { NBT } from './nbt'

export function createSpongeSchematic(schematic: SchematicDocument): Uint8Array {
  const volume = denseVolume(schematic)
  const palette = Object.fromEntries(volume.palette.map((state, index) => [state, NBT.int(index)]))
  return gzipNbt(NBT.compound({
    Version: NBT.int(2),
    DataVersion: NBT.int(schematic.minecraftDataVersion),
    Width: NBT.short(schematic.size.x),
    Height: NBT.short(schematic.size.y),
    Length: NBT.short(schematic.size.z),
    Offset: NBT.intArray([0, 0, 0]),
    PaletteMax: NBT.int(volume.palette.length),
    Palette: NBT.compound(palette),
    BlockData: NBT.byteArray(encodeVarInts(volume.indices)),
    BlockEntities: NBT.list(10, []),
    Entities: NBT.list(10, []),
    Metadata: NBT.compound({ Name: NBT.string('player-statue') }),
  }), 'Schematic')
}