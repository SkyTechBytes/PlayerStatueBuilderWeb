import { describe, expect, it } from 'vitest'
import { createMcfunction } from './mcfunction'
import {
  COMMAND_BLOCK_LIMIT,
  createCommandBlockCommands,
} from './command-block'
import { createProjectJson } from './project-json'
import { exportSchematic } from './index'
import { createDemoSkin } from '../domain/demo-skin'
import { createSchematicDocument } from '../domain/schematic'
import { generateStatue } from '../domain/statue-generator'
import type { Voxel } from '../domain/voxel-model'

const voxel: Voxel = {
  x: 2,
  y: 3,
  z: 4,
  block: 'minecraft:red_concrete',
  color: '#a12722',
}
const schematic = createSchematicDocument('classic', [voxel])

describe('statue exporters', () => {
  it('writes readable relative commands', () => {
    expect(createMcfunction(schematic)).toContain('setblock ~2 ~3 ~4 minecraft:red_concrete')
  })

  it('writes a self-contained relative command for Minecraft 26.3+', () => {
    const command = createCommandBlockCommands(schematic)[0]!

    expect(command.startsWith('summon minecraft:falling_block ~ ~1 ~')).toBe(true)
    expect(command).toContain('setblock ~3 ~2 ~4 minecraft:red_concrete')
    expect(command).toContain('id:"minecraft:armor_stand",Health:0f,Passengers:[')
    expect(command).toContain('BlockState:"minecraft:redstone_block"')
    expect(command).toContain('id:"minecraft:activator_rail",properties:{powered:"true"}')
    expect(command).toContain('minecraft:command_block_minecart')
    expect(command).toContain('fill ~ ~-2 ~ ~ ~ ~ minecraft:air')
    expect(command).not.toContain('fill ~ ~-3 ~ ~ ~ ~ minecraft:air')
  })

  it('writes legacy block states for Minecraft 1.21.6 through 26.2', () => {
    const command = createCommandBlockCommands(schematic, { version: 'legacy' })[0]!

    expect(command).toContain('BlockState:{Name:"minecraft:redstone_block"}')
    expect(command).toContain('Name:"minecraft:activator_rail",Properties:{powered:"true"}')
  })

  it('compacts rectangular regions into fill commands', () => {
    const rectangle = createSchematicDocument('classic', [
      { ...voxel, x: 0, y: 0, z: 0 },
      { ...voxel, x: 1, y: 0, z: 0 },
      { ...voxel, x: 0, y: 0, z: 1 },
      { ...voxel, x: 1, y: 0, z: 1 },
    ])

    expect(createCommandBlockCommands(rectangle)[0]).toContain('fill ~1 ~-1 ~ ~2 ~-1 ~1 minecraft:red_concrete')
  })

  it('rotates command placement for each selected facing', () => {
    expect(createCommandBlockCommands(schematic, { orientation: 'south' })[0]).toContain('setblock ~3 ~2 ~4 minecraft:red_concrete')
    expect(createCommandBlockCommands(schematic, { orientation: 'west' })[0]).toContain('setblock ~1 ~2 ~2 minecraft:red_concrete')
    expect(createCommandBlockCommands(schematic, { orientation: 'north' })[0]).toContain('setblock ~1 ~2 ~ minecraft:red_concrete')
    expect(createCommandBlockCommands(schematic, { orientation: 'east' })[0]).toContain('setblock ~5 ~2 ~ minecraft:red_concrete')
  })

  it('copies one relative air fill for undo in the selected orientation', () => {
    expect(createCommandBlockCommands(schematic, { mode: 'undo', orientation: 'south' })[0]).toContain('fill ~1 ~-1 ~ ~3 ~2 ~4 minecraft:air')
    expect(createCommandBlockCommands(schematic, { mode: 'undo', orientation: 'west' })[0]).toContain('fill ~1 ~-1 ~ ~5 ~2 ~2 minecraft:air')
    expect(createCommandBlockCommands(schematic, { mode: 'undo', version: 'legacy' })[0]).toContain('BlockState:{Name:"minecraft:redstone_block"}')
  })

  it('keeps the built-in statue within the safe command size', () => {
    const result = generateStatue(createDemoSkin(), {
      model: 'auto',
      outerLayer: true,
      families: new Set(['wool', 'planks', 'terracotta', 'concrete', 'glass']),
    })
    const demo = createSchematicDocument(result.model, result.voxels.values())

    expect(createCommandBlockCommands(demo)).toHaveLength(1)
    expect(createCommandBlockCommands(demo)[0]!.length).toBeLessThanOrEqual(COMMAND_BLOCK_LIMIT)
  })

  it('uses the selected facing through the generic exporter registry', () => {
    const artifact = exportSchematic(schematic, 'command-block', { orientation: 'east' })
    expect(Array.isArray(artifact.data)).toBe(true)
    expect(artifact.data[0]).toContain('setblock ~5 ~2 ~ minecraft:red_concrete')
  })

  it.each(['current', 'legacy'] as const)('splits large %s builds without losing or duplicating placements', (version) => {
    const detailed = createSchematicDocument('classic', Array.from({ length: 1800 }, (_, index) => ({
      ...voxel,
      x: (index % 30) * 2,
      y: Math.floor(index / 900) * 2,
      z: Math.floor(index / 30) % 30 * 2,
    })))
    for (const orientation of ['south', 'west', 'north', 'east'] as const) {
      const parts = createCommandBlockCommands(detailed, { orientation, version })
      expect(parts.length).toBeGreaterThan(2)
      const placements: string[] = []
      for (const part of parts) {
        expect(part.length).toBeLessThanOrEqual(COMMAND_BLOCK_LIMIT)
        expect(part.startsWith('summon minecraft:falling_block')).toBe(true)
        expect(part).toContain('fill ~ ~-2 ~ ~ ~ ~ minecraft:air')
        expect(part).toContain('kill @e[type=minecraft:command_block_minecart,distance=..1]')
        placements.push(...[...part.matchAll(/Command:("(?:\\.|[^"\\])*")/g)]
          .map((match) => JSON.parse(match[1]!) as string)
          .filter((command) => command.endsWith(' minecraft:red_concrete')))
      }
      expect(placements).toHaveLength(detailed.blocks.length)
      expect(new Set(placements).size).toBe(detailed.blocks.length)
      expect(createCommandBlockCommands(detailed, { orientation, version })).toEqual(parts)
    }
  })

  it('rejects empty command exports explicitly', () => {
    expect(() => createCommandBlockCommands(createSchematicDocument('classic', []))).toThrow('empty statue')
  })

  it('writes a deterministic block-state project', () => {
    const project = JSON.parse(createProjectJson(schematic))
    expect(project).toMatchObject({
      format: 'psb-statue',
      version: 1,
      size: { x: 3, y: 4, z: 5 },
      blocks: [{ x: 2, y: 3, z: 4, state: 'minecraft:red_concrete' }],
    })
  })
})
