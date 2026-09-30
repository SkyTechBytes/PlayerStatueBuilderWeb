import type { RasterImage } from './statue-generator'
import type { SkinModel } from './skin-layout'

interface Region {
  sourceX: number
  sourceY: number
  width: number
  height: number
  targetX: number
  targetY: number
}

const LEFT_LEG: readonly Region[] = [
  { sourceX: 4, sourceY: 16, width: 4, height: 4, targetX: 20, targetY: 48 },
  { sourceX: 8, sourceY: 16, width: 4, height: 4, targetX: 24, targetY: 48 },
  { sourceX: 8, sourceY: 20, width: 4, height: 12, targetX: 16, targetY: 52 },
  { sourceX: 4, sourceY: 20, width: 4, height: 12, targetX: 20, targetY: 52 },
  { sourceX: 0, sourceY: 20, width: 4, height: 12, targetX: 24, targetY: 52 },
  { sourceX: 12, sourceY: 20, width: 4, height: 12, targetX: 28, targetY: 52 },
]

const CLASSIC_LEFT_ARM: readonly Region[] = [
  { sourceX: 44, sourceY: 16, width: 4, height: 4, targetX: 36, targetY: 48 },
  { sourceX: 48, sourceY: 16, width: 4, height: 4, targetX: 40, targetY: 48 },
  { sourceX: 52, sourceY: 20, width: 4, height: 12, targetX: 44, targetY: 52 },
  { sourceX: 44, sourceY: 20, width: 4, height: 12, targetX: 36, targetY: 52 },
  { sourceX: 40, sourceY: 20, width: 4, height: 12, targetX: 40, targetY: 52 },
  { sourceX: 48, sourceY: 20, width: 4, height: 12, targetX: 32, targetY: 52 },
]

const SLIM_LEFT_ARM: readonly Region[] = [
  { sourceX: 44, sourceY: 20, width: 3, height: 12, targetX: 36, targetY: 52 },
  { sourceX: 47, sourceY: 20, width: 4, height: 12, targetX: 32, targetY: 52 },
  { sourceX: 51, sourceY: 20, width: 3, height: 12, targetX: 43, targetY: 52 },
  { sourceX: 40, sourceY: 20, width: 4, height: 12, targetX: 39, targetY: 52 },
  { sourceX: 47, sourceY: 16, width: 3, height: 4, targetX: 39, targetY: 48 },
  { sourceX: 44, sourceY: 16, width: 3, height: 4, targetX: 36, targetY: 48 },
]

export function convertLegacySkin(legacy: RasterImage, model: SkinModel): RasterImage {
  if (legacy.width !== 64 || legacy.height !== 32) {
    throw new Error('Legacy skins must be 64 x 32 pixels')
  }

  const converted: RasterImage = {
    width: 64,
    height: 64,
    data: new Uint8ClampedArray(64 * 64 * 4),
  }

  copyRegion(legacy, converted, {
    sourceX: 0,
    sourceY: 0,
    width: 64,
    height: 32,
    targetX: 0,
    targetY: 0,
  }, false)

  for (const region of LEFT_LEG) copyRegion(legacy, converted, region, true)
  const armRegions = model === 'slim' ? SLIM_LEFT_ARM : CLASSIC_LEFT_ARM
  for (const region of armRegions) copyRegion(legacy, converted, region, true)

  return converted
}

function copyRegion(source: RasterImage, target: RasterImage, region: Region, flipHorizontal: boolean) {
  for (let row = 0; row < region.height; row += 1) {
    for (let column = 0; column < region.width; column += 1) {
      const targetColumn = flipHorizontal ? region.width - 1 - column : column
      const sourceOffset = ((region.sourceY + row) * source.width + region.sourceX + column) * 4
      const targetOffset = ((region.targetY + row) * target.width + region.targetX + targetColumn) * 4
      target.data.set(source.data.subarray(sourceOffset, sourceOffset + 4), targetOffset)
    }
  }
}
