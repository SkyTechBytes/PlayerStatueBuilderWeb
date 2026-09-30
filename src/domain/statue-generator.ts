import { activePalette, nearestBlock, type PaletteFamily } from './palette'
import { convertLegacySkin } from './legacy-skin'
import type { ColorMode } from './color-distance'
import { getSkinLayout, type FaceName, type PartLayout, type SkinModel, type SkinModelChoice, type UvRect } from './skin-layout'
import { voxelKey, type VoxelMap } from './voxel-model'

export interface RasterImage {
  width: number
  height: number
  data: Uint8ClampedArray
}

export interface GenerationSettings {
  model: SkinModelChoice
  outerLayer: boolean
  families: ReadonlySet<PaletteFamily>
  colorMode?: ColorMode
}

export interface GenerationResult {
  model: SkinModel
  voxels: VoxelMap
}

const FACE_ORDER: readonly FaceName[] = ['bottom', 'right', 'left', 'top', 'back', 'front']

export function detectSkinModel(image: RasterImage): SkinModel {
  if (image.width < 64 || image.height < 64) return 'classic'
  return alphaAt(image, 54, 20) < 255 || alphaAt(image, 46, 52) < 255 ? 'slim' : 'classic'
}

export function generateStatue(image: RasterImage, settings: GenerationSettings): GenerationResult {
  if (image.width !== 64 || (image.height !== 64 && image.height !== 32)) {
    throw new Error('Choose a 64 x 64 or legacy 64 x 32 Minecraft skin')
  }

  const legacy = image.height === 32
  const model = settings.model === 'auto' ? (legacy ? 'classic' : detectSkinModel(image)) : settings.model
  const source = legacy ? convertLegacySkin(image, model) : image
  const palette = activePalette(settings.families)
  const voxels: VoxelMap = new Map()

  for (const part of getSkinLayout(model)) {
    addLayer(voxels, source, part, part.base, palette, false, settings.colorMode ?? 'lab')
    if (settings.outerLayer && part.outer) {
      addLayer(voxels, source, part, part.outer, palette, true, settings.colorMode ?? 'lab')
    }
  }

  return { model, voxels: normalizeCoordinates(voxels) }
}

function normalizeCoordinates(voxels: VoxelMap): VoxelMap {
  if (voxels.size === 0) return voxels
  const values = [...voxels.values()]
  const offsetX = -Math.min(...values.map((voxel) => voxel.x))
  const offsetY = -Math.min(...values.map((voxel) => voxel.y))
  const offsetZ = -Math.min(...values.map((voxel) => voxel.z))
  if (offsetX === 0 && offsetY === 0 && offsetZ === 0) return voxels

  const normalized: VoxelMap = new Map()
  for (const voxel of values) {
    const next = { ...voxel, x: voxel.x + offsetX, y: voxel.y + offsetY, z: voxel.z + offsetZ }
    normalized.set(voxelKey(next.x, next.y, next.z), next)
  }
  return normalized
}

function addLayer(
  voxels: VoxelMap,
  image: RasterImage,
  part: PartLayout,
  layer: Record<FaceName, UvRect>,
  palette: ReturnType<typeof activePalette>,
  outer: boolean,
  colorMode: ColorMode,
): void {
  for (const face of FACE_ORDER) {
    const uv = layer[face]
    for (let row = 0; row < uv.height; row += 1) {
      for (let column = 0; column < uv.width; column += 1) {
        const pixel = pixelAt(image, uv.x + column, uv.y + row)
        if (pixel.alpha < 32) continue

        const [x, y, z] = faceCoordinate(part, face, column, row, outer)
        const block = nearestBlock(pixel.red, pixel.green, pixel.blue, pixel.alpha, palette, colorMode)
        voxels.set(voxelKey(x, y, z), { x, y, z, block: block.id, color: block.color })
      }
    }
  }
}

function faceCoordinate(
  part: PartLayout,
  face: FaceName,
  column: number,
  row: number,
  outer: boolean,
): readonly [number, number, number] {
  const [originX, originY, originZ] = part.origin
  const [sizeX, sizeY, sizeZ] = part.size
  const distance = outer ? 1 : 0

  switch (face) {
    case 'front': return [originX + column, originY + sizeY - 1 - row, originZ + sizeZ - 1 + distance]
    case 'back': return [originX + sizeX - 1 - column, originY + sizeY - 1 - row, originZ - distance]
    case 'right': return [originX - distance, originY + sizeY - 1 - row, originZ + column]
    case 'left': return [originX + sizeX - 1 + distance, originY + sizeY - 1 - row, originZ + sizeZ - 1 - column]
    case 'top': return [originX + column, originY + sizeY - 1 + distance, originZ + row]
    case 'bottom': return [originX + column, originY - distance, originZ + sizeZ - 1 - row]
  }
}

function pixelAt(image: RasterImage, x: number, y: number) {
  const offset = (y * image.width + x) * 4
  return {
    red: image.data[offset] ?? 0,
    green: image.data[offset + 1] ?? 0,
    blue: image.data[offset + 2] ?? 0,
    alpha: image.data[offset + 3] ?? 0,
  }
}

function alphaAt(image: RasterImage, x: number, y: number): number {
  return image.data[(y * image.width + x) * 4 + 3] ?? 0
}
