import { gunzipSync } from 'fflate'
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js'
import { describe, expect, it } from 'vitest'
import { createSchematicDocument } from '../domain/schematic'
import type { Voxel } from '../domain/voxel-model'
import { createCsv } from './csv'
import { createGlb, createGlbCompat } from './glb'
import { SCHEMATIC_EXPORTERS, exportSchematic } from './index'
import { createLegacySchematic } from './legacy-schematic'
import { createLitematic } from './litematic'
import { encodeVarInts, packBlockStates } from './minecraft-common'
import { createPly, createPlyCompat } from './ply'
import { createSpongeSchematic } from './sponge-schem'
import { createStructureNbt } from './structure-nbt'

const voxels: Voxel[] = [
  { x: 0, y: 0, z: 0, block: 'minecraft:red_concrete', color: '#901d1d' },
  { x: 1, y: 0, z: 0, block: 'minecraft:blue_stained_glass', color: '#697cc5' },
]
const schematic = createSchematicDocument('classic', voxels)
const decoder = new TextDecoder()

function decodedNbt(output: Uint8Array): { bytes: Uint8Array; text: string } {
  expect([...output.slice(0, 2)]).toEqual([0x1f, 0x8b])
  const bytes = gunzipSync(output)
  expect(bytes[0]).toBe(10)
  return { bytes, text: decoder.decode(bytes) }
}

describe('Minecraft binary exporters', () => {
  it('writes structure-block NBT with palette and block lists', () => {
    const { text } = decodedNbt(createStructureNbt(schematic))
    expect(text).toContain('DataVersion')
    expect(text).toContain('minecraft:red_concrete')
    expect(text).toContain('blocks')
  })

  it('writes Sponge schematic NBT with dense block data', () => {
    const { text } = decodedNbt(createSpongeSchematic(schematic))
    expect(text).toContain('Schematic')
    expect(text).toContain('PaletteMax')
    expect(text).toContain('BlockData')
    expect(text).toContain('minecraft:air')
  })

  it('writes Litematica regions and packed block states', () => {
    const { text } = decodedNbt(createLitematic(schematic))
    expect(text).toContain('MinecraftDataVersion')
    expect(text).toContain('Regions')
    expect(text).toContain('BlockStatePalette')
    expect(text).toContain('BlockStates')
  })

  it('writes legacy MCEdit schematic arrays', () => {
    const { text } = decodedNbt(createLegacySchematic(schematic))
    expect(text).toContain('Schematic')
    expect(text).toContain('Materials')
    expect(text).toContain('Alpha')
    expect(text).toContain('Blocks')
  })

  it('encodes Sponge varints and Litematica packed values', () => {
    expect([...encodeVarInts([0, 127, 128, 300])]).toEqual([0, 127, 128, 1, 172, 2])
    expect(packBlockStates([0, 1, 2, 3], 4)[0]).toBe(228n)
  })
})

describe('interchange and 3D exporters', () => {
  it('writes CSV block states and colors', () => {
    expect(createCsv(schematic)).toContain('1,0,0,minecraft:blue_stained_glass,#697cc5')
  })

  it('writes indexed PLY geometry with RGBA vertex colors', () => {
    const ply = createPly(schematic)
    expect(ply).toContain('element vertex 16')
    expect(ply).toContain('element face 12')
    expect(ply).toContain('105 124 197 117')
    expect(ply).toContain('property uchar alpha')
  })

  it('writes strict-importer PLY compatibility output without alpha', () => {
    const ply = createPlyCompat(schematic)
    expect(ply).not.toContain('property uchar alpha')
    const geometry = new PLYLoader().parse(new TextEncoder().encode(ply).buffer)
    expect(geometry.getAttribute('position').count).toBe(16)
    expect(geometry.getAttribute('color').count).toBe(16)
  })

  it('writes a valid GLB container and glTF scene', () => {
    const glb = createGlb(schematic)
    const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength)
    expect(view.getUint32(0, true)).toBe(0x46546c67)
    expect(view.getUint32(4, true)).toBe(2)
    expect(view.getUint32(8, true)).toBe(glb.length)
    const jsonLength = view.getUint32(12, true)
    const json = JSON.parse(decoder.decode(glb.slice(20, 20 + jsonLength)).trim())
    expect(json.asset.version).toBe('2.0')
    expect(json.accessors[0].count).toBe(48)
    expect(json.accessors[2].type).toBe('VEC4')
    expect(json.materials[0].alphaMode).toBe('BLEND')
  })

  it('writes opaque RGB-only GLB compatibility output', () => {
    const glb = createGlbCompat(schematic)
    const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength)
    const jsonLength = view.getUint32(12, true)
    const json = JSON.parse(decoder.decode(glb.slice(20, 20 + jsonLength)).trim())
    expect(json.accessors[2].type).toBe('VEC3')
    expect(json.materials[0]).not.toHaveProperty('alphaMode')
  })

  it('registers every converter with a non-empty artifact', () => {
    expect(SCHEMATIC_EXPORTERS).toHaveLength(12)
    expect(SCHEMATIC_EXPORTERS[0].id).toBe('command-block')
    expect(SCHEMATIC_EXPORTERS[0].commandOptions).toBe(true)
    for (const exporter of SCHEMATIC_EXPORTERS) {
      const artifact = exportSchematic(schematic, exporter.id)
      expect(artifact.filename).toBe(`player-statue${exporter.extension}`)
      expect(artifact.data.length).toBeGreaterThan(0)
    }
  })
})