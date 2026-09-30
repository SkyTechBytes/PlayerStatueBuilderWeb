import { describe, expect, it } from 'vitest'
import type { RasterImage } from './statue-generator'
import { convertLegacySkin } from './legacy-skin'

function legacySkin(): RasterImage {
  return { width: 64, height: 32, data: new Uint8ClampedArray(64 * 32 * 4) }
}

function setPixel(image: RasterImage, x: number, y: number, red: number) {
  const offset = (y * image.width + x) * 4
  image.data.set([red, 0, 0, 255], offset)
}

function reds(image: RasterImage, x: number, y: number, width: number): number[] {
  return Array.from({ length: width }, (_, index) => image.data[(y * image.width + x + index) * 4]!)
}

describe('legacy skin conversion', () => {
  it('copies the original layout and mirrors classic right limbs into left-limb slots', () => {
    const legacy = legacySkin()
    setPixel(legacy, 8, 8, 91)
    ;[11, 22, 33, 44].forEach((red, index) => setPixel(legacy, 4 + index, 20, red))
    ;[51, 62, 73, 84].forEach((red, index) => setPixel(legacy, 44 + index, 20, red))

    const converted = convertLegacySkin(legacy, 'classic')

    expect(converted.width).toBe(64)
    expect(converted.height).toBe(64)
    expect(converted.data[(8 * 64 + 8) * 4]).toBe(91)
    expect(reds(converted, 20, 52, 4)).toEqual([44, 33, 22, 11])
    expect(reds(converted, 36, 52, 4)).toEqual([84, 73, 62, 51])
    expect(converted.data[(36 * 64 + 20) * 4 + 3]).toBe(0)
    expect(legacy.height).toBe(32)
  })

  it('mirrors three-pixel arm faces for slim conversion', () => {
    const legacy = legacySkin()
    ;[15, 25, 35].forEach((red, index) => setPixel(legacy, 44 + index, 20, red))

    const converted = convertLegacySkin(legacy, 'slim')

    expect(reds(converted, 36, 52, 3)).toEqual([35, 25, 15])
    expect(converted.data[(52 * 64 + 39) * 4 + 3]).toBe(0)
  })
})