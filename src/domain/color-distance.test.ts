import { describe, expect, it } from 'vitest'
import { colorDistance, rgbToLab, type ColorMode } from './color-distance'

describe('upstream color distances', () => {
  it('uses equal-weight RGB formulas', () => {
    expect(colorDistance('rgb', [10, 20, 30], [13, 24, 35])).toBe(50)
    expect(colorDistance('absrgb', [10, 20, 30], [13, 24, 35])).toBe(12)
  })

  it('matches the upstream D65 LAB conversion', () => {
    expect(rgbToLab(255, 255, 255)[0]).toBeCloseTo(100, 5)
    expect(rgbToLab(255, 0, 0)).toEqual([
      expect.closeTo(53.2408, 3),
      expect.closeTo(80.0925, 3),
      expect.closeTo(67.2032, 3),
    ])
  })

  it('returns zero for identical colors in every mode', () => {
    const modes: ColorMode[] = ['lab', 'rgb', 'absrgb', 'hsb', 'hsl']
    for (const mode of modes) {
      expect(colorDistance(mode, [42, 93, 171], [42, 93, 171])).toBe(0)
    }
  })
})