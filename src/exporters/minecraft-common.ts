import { gzipSync } from 'fflate'
import type { SchematicDocument } from '../domain/schematic'
import { encodeNbt, NBT, type NbtTag } from './nbt'

export interface DenseVolume {
  palette: string[]
  indices: number[]
}

export function denseVolume(schematic: SchematicDocument): DenseVolume {
  const palette = ['minecraft:air', ...schematic.palette.map((entry) => entry.state)]
  const indices = new Array<number>(schematic.size.x * schematic.size.y * schematic.size.z).fill(0)
  for (const block of schematic.blocks) {
    const index = block.x + block.z * schematic.size.x + block.y * schematic.size.x * schematic.size.z
    indices[index] = block.palette + 1
  }
  return { palette, indices }
}

export function stateTag(state: string): NbtTag {
  const bracket = state.indexOf('[')
  const name = bracket < 0 ? state : state.slice(0, bracket)
  const properties: Record<string, string> | null = bracket < 0
    ? null
    : Object.fromEntries(state.slice(bracket + 1, -1).split(',').map((item) => item.split('=', 2)))
  return NBT.compound({
    Name: NBT.string(name),
    ...(properties ? { Properties: NBT.compound(Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, NBT.string(value)]))) } : {}),
  })
}

export function gzipNbt(root: NbtTag, rootName = ''): Uint8Array {
  return gzipSync(encodeNbt(root, rootName), { level: 9 })
}

export function encodeVarInts(values: number[]): Uint8Array {
  const output: number[] = []
  for (const value of values) {
    let remaining = value >>> 0
    do {
      let byte = remaining & 0x7f
      remaining >>>= 7
      if (remaining) byte |= 0x80
      output.push(byte)
    } while (remaining)
  }
  return Uint8Array.from(output)
}

export function packBlockStates(values: number[], paletteSize: number): bigint[] {
  const bits = Math.max(2, Math.ceil(Math.log2(Math.max(paletteSize, 1))))
  const output = new Array<bigint>(Math.ceil(values.length * bits / 64)).fill(0n)
  const mask = (1n << BigInt(bits)) - 1n
  values.forEach((value, index) => {
    const bitIndex = index * bits
    const longIndex = Math.floor(bitIndex / 64)
    const offset = bitIndex % 64
    const encoded = BigInt(value) & mask
    output[longIndex] |= encoded << BigInt(offset)
    if (offset + bits > 64) output[longIndex + 1] |= encoded >> BigInt(64 - offset)
  })
  return output.map((value) => BigInt.asIntN(64, value))
}