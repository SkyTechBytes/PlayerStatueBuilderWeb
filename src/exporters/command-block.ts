import type { SchematicDocument } from '../domain/schematic'
import type { BlockId } from '../domain/voxel-model'

export const COMMAND_BLOCK_LIMIT = 32_000

interface PlacedBlock {
  x: number
  y: number
  z: number
  state: BlockId
}

interface BlockBox extends PlacedBlock {
  maxX: number
  maxY: number
  maxZ: number
}

export function createCommandBlockCommand(schematic: SchematicDocument): string {
  return createCommandBlockCommandForVersion(schematic, 'current')
}

export function createLegacyCommandBlockCommand(schematic: SchematicDocument): string {
  return createCommandBlockCommandForVersion(schematic, 'legacy')
}

function createCommandBlockCommandForVersion(schematic: SchematicDocument, version: 'current' | 'legacy'): string {
  const commands = compactBlocks(schematic).map(createPlacementCommand)
  const minecarts = [
    ...commands,
    'setblock ~ ~1 ~ minecraft:command_block{auto:1b,Command:"fill ~ ~-3 ~ ~ ~ ~ minecraft:air"}',
    'kill @e[type=minecraft:command_block_minecart,distance=..1]',
  ].map((command) => `{id:"minecraft:command_block_minecart",Command:${JSON.stringify(command)}}`).join(',')

  const redstoneBlock = version === 'current'
    ? '"minecraft:redstone_block"'
    : '{Name:"minecraft:redstone_block"}'
  const activatorRail = version === 'current'
    ? '{id:"minecraft:activator_rail",properties:{powered:"true"}}'
    : '{Name:"minecraft:activator_rail",Properties:{powered:"true"}}'
  const command = `summon minecraft:falling_block ~ ~1 ~ {BlockState:${redstoneBlock},Time:1,DropItem:0b,Passengers:[{id:"minecraft:armor_stand",Health:0f,Passengers:[{id:"minecraft:falling_block",BlockState:${activatorRail},Time:1,DropItem:0b,Passengers:[${minecarts}]}]}]}`
  if (command.length > COMMAND_BLOCK_LIMIT) {
    throw new Error(`Command is ${command.length.toLocaleString()} characters; Minecraft's safe limit is ${COMMAND_BLOCK_LIMIT.toLocaleString()}. Download the .mcfunction export instead.`)
  }
  return command
}

function compactBlocks(schematic: SchematicDocument): BlockBox[] {
  const remaining = new Map<string, PlacedBlock>()
  for (const block of schematic.blocks) {
    const state = schematic.palette[block.palette]?.state
    if (!state) throw new Error(`Block references missing palette index ${block.palette}`)
    remaining.set(key(block.x, block.y, block.z), { x: block.x, y: block.y, z: block.z, state })
  }

  const boxes: BlockBox[] = []
  const ordered = [...remaining.values()].sort((left, right) => (
    left.y - right.y || left.z - right.z || left.x - right.x || left.state.localeCompare(right.state)
  ))

  for (const start of ordered) {
    if (!remaining.has(key(start.x, start.y, start.z))) continue
    let maxX = start.x
    while (sameBlock(remaining, maxX + 1, start.y, start.z, start.state)) maxX += 1

    let maxZ = start.z
    while (rowMatches(remaining, start.x, maxX, start.y, maxZ + 1, start.state)) maxZ += 1

    let maxY = start.y
    while (planeMatches(remaining, start.x, maxX, maxY + 1, start.z, maxZ, start.state)) maxY += 1

    for (let y = start.y; y <= maxY; y += 1) {
      for (let z = start.z; z <= maxZ; z += 1) {
        for (let x = start.x; x <= maxX; x += 1) remaining.delete(key(x, y, z))
      }
    }
    boxes.push({ ...start, maxX, maxY, maxZ })
  }

  return boxes
}

function createPlacementCommand(box: BlockBox): string {
  const from = relativePosition(box.x + 1, box.y - 1, box.z)
  if (box.x === box.maxX && box.y === box.maxY && box.z === box.maxZ) {
    return `setblock ${from} ${box.state}`
  }
  const to = relativePosition(box.maxX + 1, box.maxY - 1, box.maxZ)
  return `fill ${from} ${to} ${box.state}`
}

function relativePosition(x: number, y: number, z: number): string {
  return `${relative(x)} ${relative(y)} ${relative(z)}`
}

function relative(value: number): string {
  return value === 0 ? '~' : `~${value}`
}

function sameBlock(blocks: ReadonlyMap<string, PlacedBlock>, x: number, y: number, z: number, state: BlockId): boolean {
  return blocks.get(key(x, y, z))?.state === state
}

function rowMatches(blocks: ReadonlyMap<string, PlacedBlock>, minX: number, maxX: number, y: number, z: number, state: BlockId): boolean {
  for (let x = minX; x <= maxX; x += 1) if (!sameBlock(blocks, x, y, z, state)) return false
  return true
}

function planeMatches(blocks: ReadonlyMap<string, PlacedBlock>, minX: number, maxX: number, y: number, minZ: number, maxZ: number, state: BlockId): boolean {
  for (let z = minZ; z <= maxZ; z += 1) {
    if (!rowMatches(blocks, minX, maxX, y, z, state)) return false
  }
  return true
}

function key(x: number, y: number, z: number): string {
  return `${x},${y},${z}`
}