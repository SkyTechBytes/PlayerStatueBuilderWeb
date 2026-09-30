import { describe, expect, it } from 'vitest'
import { createMcfunction } from './mcfunction'
import { COMMAND_BLOCK_LIMIT, createCommandBlockCommand, createLegacyCommandBlockCommand } from './command-block'
import { createProjectJson } from './project-json'
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
    const command = createCommandBlockCommand(schematic)

    expect(command.startsWith('summon minecraft:falling_block ~ ~1 ~')).toBe(true)
    expect(command).toContain('setblock ~3 ~2 ~4 minecraft:red_concrete')
    expect(command).toContain('id:"minecraft:armor_stand",Health:0f,Passengers:[')
    expect(command).toContain('BlockState:"minecraft:redstone_block"')
    expect(command).toContain('id:"minecraft:activator_rail",properties:{powered:"true"}')
    expect(command).toContain('minecraft:command_block_minecart')
  })

  it('writes legacy block states for Minecraft 1.21.6 through 26.2', () => {
    const command = createLegacyCommandBlockCommand(schematic)

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

    expect(createCommandBlockCommand(rectangle)).toContain('fill ~1 ~-1 ~ ~2 ~-1 ~1 minecraft:red_concrete')
  })

  it('keeps the built-in statue within the safe command size', () => {
    const result = generateStatue(createDemoSkin(), {
      model: 'auto',
      outerLayer: true,
      families: new Set(['wool', 'planks', 'terracotta', 'concrete', 'glass']),
    })
    const demo = createSchematicDocument(result.model, result.voxels.values())

    expect(createCommandBlockCommand(demo).length).toBeLessThanOrEqual(COMMAND_BLOCK_LIMIT)
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
