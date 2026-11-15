import type { SchematicDocument } from '../domain/schematic'
import type { BlockId } from '../domain/voxel-model'

export const COMMAND_BLOCK_LIMIT = 32_500

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

export type StatueOrientation = 'south' | 'west' | 'north' | 'east'
export interface CommandBlockOptions {
  orientation?: StatueOrientation
  version?: 'current' | 'legacy'
  mode?: 'build' | 'undo'
}

export function createCommandBlockCommands(schematic: SchematicDocument, options: CommandBlockOptions = {}): string[] {
  if (schematic.blocks.length === 0) throw new Error('Cannot create commands for an empty statue')
  const { orientation = 'south', version = 'current', mode = 'build' } = options
  const commands = mode === 'build'
    ? compactBlocks(schematic, orientation).map(createPlacementCommand)
    : [createClearCommand(schematic, orientation)]
  const overhead = createRig([], version).length + 1
  const parts: string[] = []
  let batch: string[] = []
  let length = overhead
  for (const command of commands) {
    const minecart = createMinecart(command)
    if (overhead + minecart.length > COMMAND_BLOCK_LIMIT) {
      throw new Error('A single placement exceeds the command-block character limit')
    }
    const separator = batch.length > 0 ? 1 : 0
    if (length + separator + minecart.length > COMMAND_BLOCK_LIMIT) {
      parts.push(createRig(batch, version))
      batch = []
      length = overhead
    }
    length += (batch.length > 0 ? 1 : 0) + minecart.length
    batch.push(minecart)
  }
  if (batch.length > 0) parts.push(createRig(batch, version))
  return parts
}

function createMinecart(command: string): string {
  return `{id:"minecraft:command_block_minecart",Command:${JSON.stringify(command)}}`
}

function createRig(placements: readonly string[], version: 'current' | 'legacy'): string {
  const cleanup = [
    'setblock ~ ~1 ~ minecraft:command_block{auto:1b,Command:"fill ~ ~-2 ~ ~ ~ ~ minecraft:air"}',
    'kill @e[type=minecraft:command_block_minecart,distance=..1]',
  ].map(createMinecart)
  const minecarts = [...placements, ...cleanup].join(',')

  const redstoneBlock = version === 'current'
    ? '"minecraft:redstone_block"'
    : '{Name:"minecraft:redstone_block"}'
  const activatorRail = version === 'current'
    ? '{id:"minecraft:activator_rail",properties:{powered:"true"}}'
    : '{Name:"minecraft:activator_rail",Properties:{powered:"true"}}'
  return `summon minecraft:falling_block ~ ~1 ~ {BlockState:${redstoneBlock},Time:1,DropItem:0b,Passengers:[{id:"minecraft:armor_stand",Health:0f,Passengers:[{id:"minecraft:falling_block",BlockState:${activatorRail},Time:1,DropItem:0b,Passengers:[${minecarts}]}]}]}`
}

function compactBlocks(schematic: SchematicDocument, orientation: StatueOrientation): BlockBox[] {
  const remaining = new Map<string, PlacedBlock>()
  for (const block of schematic.blocks) {
    const state = schematic.palette[block.palette]?.state
    if (!state) throw new Error(`Block references missing palette index ${block.palette}`)
    const position = orientPosition(block.x, block.z, schematic.size.x, schematic.size.z, orientation)
    remaining.set(key(position.x, block.y, position.z), { ...position, y: block.y, state })
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

function createClearCommand(schematic: SchematicDocument, orientation: StatueOrientation): string {
  const size = orientedSize(schematic.size.x, schematic.size.z, orientation)
  return `fill ${relativePosition(1, -1, 0)} ${relativePosition(size.x, schematic.size.y - 2, size.z - 1)} minecraft:air`
}

function orientPosition(x: number, z: number, width: number, depth: number, orientation: StatueOrientation): { x: number; z: number } {
  switch (orientation) {
    case 'west': return { x: depth - 1 - z, z: x }
    case 'north': return { x: width - 1 - x, z: depth - 1 - z }
    case 'east': return { x: z, z: width - 1 - x }
    case 'south': return { x, z }
  }
}

function orientedSize(width: number, depth: number, orientation: StatueOrientation): { x: number; z: number } {
  return orientation === 'east' || orientation === 'west'
    ? { x: depth, z: width }
    : { x: width, z: depth }
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