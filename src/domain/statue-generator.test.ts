import { describe, expect, it } from 'vitest'
import { createDemoSkin } from './demo-skin'
import { getSkinLayout } from './skin-layout'
import { detectSkinModel, generateStatue } from './statue-generator'

const families = new Set(['concrete'] as const)

describe('statue generator', () => {
  it('detects classic and slim arm markers', () => {
    const classic = createDemoSkin()
    expect(detectSkinModel(classic)).toBe('classic')

    const slim = createDemoSkin()
    slim.data[(20 * 64 + 54) * 4 + 3] = 0
    expect(detectSkinModel(slim)).toBe('slim')
  })

  it('places slim arms directly against the torso', () => {
    const layout = getSkinLayout('slim')
    const torso = layout.find((part) => part.name === 'Torso')!
    const rightArm = layout.find((part) => part.name === 'Right arm')!
    const leftArm = layout.find((part) => part.name === 'Left arm')!

    expect(torso.origin[0]).toBe(4)
    expect(rightArm.origin[0] + rightArm.size[0]).toBe(torso.origin[0])
    expect(leftArm.origin[0]).toBe(torso.origin[0] + torso.size[0])
  })

  it('creates a bounded statue from visible skin pixels', () => {
    const result = generateStatue(createDemoSkin(), {
      model: 'classic',
      outerLayer: false,
      families,
    })

    expect(result.voxels.size).toBeGreaterThan(500)
    expect([...result.voxels.values()].every((voxel) => voxel.y >= 0 && voxel.y < 32)).toBe(true)
    expect([...result.voxels.values()].every((voxel) => voxel.block.startsWith('minecraft:'))).toBe(true)
  })

  it('normalizes outer-layer blocks to non-negative coordinates', () => {
    const result = generateStatue(createDemoSkin(), {
      model: 'classic',
      outerLayer: true,
      families,
    })

    expect(Math.min(...[...result.voxels.values()].map((voxel) => voxel.x))).toBe(0)
    expect(Math.min(...[...result.voxels.values()].map((voxel) => voxel.y))).toBe(0)
    expect(Math.min(...[...result.voxels.values()].map((voxel) => voxel.z))).toBe(0)
  })

  it('ignores a fully transparent skin', () => {
    const image = createDemoSkin()
    image.data.fill(0)

    const result = generateStatue(image, {
      model: 'classic',
      outerLayer: true,
      families,
    })

    expect(result.voxels.size).toBe(0)
  })

  it('converts and generates legacy 64 x 32 skins', () => {
    const modern = createDemoSkin()
    const legacy = { width: 64, height: 32, data: modern.data.slice(0, 64 * 32 * 4) }

    const result = generateStatue(legacy, {
      model: 'classic',
      outerLayer: true,
      families,
    })

    expect(result.model).toBe('classic')
    expect(result.voxels.size).toBeGreaterThan(500)
  })

  it('rejects non-modern skin dimensions', () => {
    expect(() => generateStatue({
      width: 64,
      height: 48,
      data: new Uint8ClampedArray(64 * 48 * 4),
    }, {
      model: 'auto',
      outerLayer: true,
      families,
    })).toThrow('64 x 64 or legacy 64 x 32')
  })
})
