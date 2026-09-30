import { describe, expect, it } from 'vitest'
import { activePalette, nearestBlock, PALETTE, type PaletteFamily } from './palette'

const allFamilies = new Set<PaletteFamily>([
  'wool',
  'planks',
  'terracotta',
  'concrete',
  'glass',
  'gray',
])

describe('upstream palette maps', () => {
  it('contains every effective PlayerStatueBuilderX map entry', () => {
    const counts = Object.fromEntries(
      [...allFamilies].map((family) => [family, PALETTE.filter((block) => block.family === family).length]),
    )

    expect(counts).toEqual({ wool: 16, planks: 7, terracotta: 17, concrete: 16, glass: 15, gray: 14 })
    expect(PALETTE).toHaveLength(85)
  })

  it('preserves upstream colors with the corrected purple wool entry', () => {
    const byId = new Map(PALETTE.map((block) => [block.id, block]))

    expect(byId.get('minecraft:magenta_wool')?.color).toBe('#bd4483')
    expect(byId.get('minecraft:purple_wool')?.color).toBe('#7a2aad')
    expect(byId.get('minecraft:blue_wool')?.color).toBe('#35399d')
    expect(byId.get('minecraft:mangrove_planks')?.rgb).toEqual([131, 68, 50])
    expect(byId.has('minecraft:gray_stained_glass')).toBe(false)
    expect(byId.get('minecraft:light_gray_stained_glass')?.color).toBe('#898a8a')
  })

  it('matches the corrected purple wool color', () => {
    const palette = activePalette(new Set<PaletteFamily>(['wool']))

    expect(nearestBlock(122, 42, 173, 255, palette).id).toBe('minecraft:purple_wool')
  })

  it('matches opaque pixels to solids and translucent pixels to glass', () => {
    const palette = activePalette(new Set<PaletteFamily>(['concrete', 'glass']))

    expect(nearestBlock(247, 248, 248, 255, palette).id).toBe('minecraft:white_concrete')
    expect(nearestBlock(247, 248, 248, 100, palette).id).toBe('minecraft:white_stained_glass')
  })
})