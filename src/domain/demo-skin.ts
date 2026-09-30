import type { RasterImage } from './statue-generator'

export function createDemoSkin(): RasterImage {
  const width = 64
  const height = 64
  const data = new Uint8ClampedArray(width * height * 4)

  fill(data, width, 0, 0, 64, 64, [0, 0, 0, 0])
  fill(data, width, 0, 0, 32, 16, [204, 151, 116, 255])
  fill(data, width, 8, 8, 8, 8, [222, 170, 130, 255])
  fill(data, width, 8, 8, 8, 3, [58, 39, 32, 255])
  fill(data, width, 10, 11, 2, 2, [66, 95, 120, 255])
  fill(data, width, 14, 11, 2, 2, [66, 95, 120, 255])
  fill(data, width, 0, 8, 32, 8, [121, 70, 48, 255])
  fill(data, width, 16, 16, 24, 16, [36, 99, 122, 255])
  fill(data, width, 0, 16, 16, 16, [47, 53, 58, 255])
  fill(data, width, 40, 16, 16, 16, [222, 170, 130, 255])
  fill(data, width, 0, 32, 40, 16, [48, 108, 130, 220])
  fill(data, width, 0, 48, 32, 16, [41, 48, 56, 255])
  fill(data, width, 32, 48, 32, 16, [222, 170, 130, 255])
  fill(data, width, 40, 8, 16, 8, [77, 45, 35, 210])

  return { width, height, data }
}

function fill(
  data: Uint8ClampedArray,
  imageWidth: number,
  x: number,
  y: number,
  width: number,
  height: number,
  color: readonly [number, number, number, number],
): void {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      const offset = (row * imageWidth + column) * 4
      data.set(color, offset)
    }
  }
}
