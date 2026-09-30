import type { SchematicDocument } from '../domain/schematic'

const FACES = [
  { normal: [0, 0, -1], corners: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]] },
  { normal: [0, 0, 1], corners: [[0.5, -0.5, 0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [0.5, 0.5, 0.5]] },
  { normal: [-1, 0, 0], corners: [[-0.5, -0.5, 0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [-0.5, 0.5, 0.5]] },
  { normal: [1, 0, 0], corners: [[0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5]] },
  { normal: [0, 1, 0], corners: [[-0.5, 0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },
  { normal: [0, -1, 0], corners: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [-0.5, -0.5, -0.5]] },
] as const

export function createGlb(schematic: SchematicDocument, includeAlpha = true): Uint8Array {
  const positions: number[] = []
  const normals: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  for (const block of schematic.blocks) {
    const entry = schematic.palette[block.palette]
    if (!entry) throw new Error(`Block references missing palette index ${block.palette}`)
    const color = [1, 3, 5].map((offset) => Number.parseInt(entry.color.slice(offset, offset + 2), 16))
    const alpha = Math.round(entry.opacity * 255)
    for (const face of FACES) {
      const base = positions.length / 3
      for (const corner of face.corners) {
        positions.push(block.x + corner[0], block.y + corner[1], block.z + corner[2])
        normals.push(...face.normal)
        colors.push(...color, ...(includeAlpha ? [alpha] : []))
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
    }
  }

  const chunks = [bytesOf(new Float32Array(positions)), bytesOf(new Float32Array(normals)), Uint8Array.from(colors), bytesOf(new Uint32Array(indices))]
  const offsets: number[] = []
  let byteLength = 0
  for (const chunk of chunks) {
    byteLength = align4(byteLength)
    offsets.push(byteLength)
    byteLength += chunk.byteLength
  }
  const binary = new Uint8Array(align4(byteLength))
  chunks.forEach((chunk, index) => binary.set(chunk, offsets[index]))

  const vertexCount = positions.length / 3
  const gltf = {
    asset: { version: '2.0', generator: 'Player Statue Builder Web' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'player-statue' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, indices: 3, material: 0 }] }],
    materials: [{
      pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.82 },
      ...(includeAlpha ? { alphaMode: 'BLEND' } : {}),
    }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: vertexCount, type: 'VEC3', min: [-0.5, -0.5, -0.5], max: [schematic.size.x - 0.5, schematic.size.y - 0.5, schematic.size.z - 0.5] },
      { bufferView: 1, componentType: 5126, count: vertexCount, type: 'VEC3' },
      { bufferView: 2, componentType: 5121, normalized: true, count: vertexCount, type: includeAlpha ? 'VEC4' : 'VEC3' },
      { bufferView: 3, componentType: 5125, count: indices.length, type: 'SCALAR' },
    ],
    bufferViews: chunks.map((chunk, index) => ({ buffer: 0, byteOffset: offsets[index], byteLength: chunk.byteLength, target: index === 3 ? 34963 : 34962 })),
    buffers: [{ byteLength: binary.byteLength }],
  }
  return buildGlb(gltf, binary)
}

export function createGlbCompat(schematic: SchematicDocument): Uint8Array {
  return createGlb(schematic, false)
}

function bytesOf(array: Float32Array | Uint32Array): Uint8Array {
  return new Uint8Array(array.buffer, array.byteOffset, array.byteLength)
}

function align4(value: number): number {
  return (value + 3) & ~3
}

function buildGlb(gltf: object, binary: Uint8Array): Uint8Array {
  const json = new TextEncoder().encode(JSON.stringify(gltf))
  const jsonLength = align4(json.length)
  const totalLength = 12 + 8 + jsonLength + 8 + binary.length
  const output = new Uint8Array(totalLength)
  const view = new DataView(output.buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, totalLength, true)
  view.setUint32(12, jsonLength, true)
  view.setUint32(16, 0x4e4f534a, true)
  output.fill(0x20, 20, 20 + jsonLength)
  output.set(json, 20)
  const binaryHeader = 20 + jsonLength
  view.setUint32(binaryHeader, binary.length, true)
  view.setUint32(binaryHeader + 4, 0x004e4942, true)
  output.set(binary, binaryHeader + 8)
  return output
}