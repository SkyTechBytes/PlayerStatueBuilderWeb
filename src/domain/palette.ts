import type { BlockId } from './voxel-model'
import { colorDistance, type ColorMode } from './color-distance'

export type PaletteFamily = 'wool' | 'planks' | 'terracotta' | 'concrete' | 'glass' | 'gray'

export interface PaletteBlock {
  id: BlockId
  label: string
  family: PaletteFamily
  color: string
  rgb: readonly [number, number, number]
  transparent: boolean
}

type BlockDefinition = readonly [id: string, color: string]

function blocks(family: PaletteFamily, definitions: readonly BlockDefinition[], transparent = false): PaletteBlock[] {
  return definitions.map(([id, color]) => ({
    id: `minecraft:${id}` as BlockId,
    label: id.replaceAll('_', ' '),
    family,
    color,
    rgb: [Number.parseInt(color.slice(1, 3), 16), Number.parseInt(color.slice(3, 5), 16), Number.parseInt(color.slice(5, 7), 16)],
    transparent,
  }))
}

export const PALETTE: readonly PaletteBlock[] = [
  ...blocks('wool', [
    ['white_wool', '#e9ecec'], ['orange_wool', '#f07613'], ['magenta_wool', '#bd4483'],
    ['light_blue_wool', '#3aafd9'], ['yellow_wool', '#f8c627'], ['lime_wool', '#70b919'],
    ['pink_wool', '#ed8dac'], ['gray_wool', '#3e4447'], ['light_gray_wool', '#8e8e86'],
    ['cyan_wool', '#158991'], ['purple_wool', '#7a2aad'], ['blue_wool', '#35399d'], ['brown_wool', '#724728'],
    ['green_wool', '#546d1b'], ['red_wool', '#a12722'], ['black_wool', '#141519'],
  ]),
  ...blocks('planks', [
    ['oak_planks', '#9d8248'], ['birch_planks', '#b8a771'], ['spruce_planks', '#7e5b30'],
    ['jungle_planks', '#af7e59'], ['dark_oak_planks', '#261302'], ['acacia_planks', '#b86535'],
    ['mangrove_planks', '#834432'],
  ]),
  ...blocks('terracotta', [
    ['terracotta', '#93583d'], ['blue_terracotta', '#483959'], ['brown_terracotta', '#492d1b'],
    ['green_terracotta', '#474e22'], ['red_terracotta', '#8b3527'], ['black_terracotta', '#1b0c04'],
    ['white_terracotta', '#d2b4a1'], ['orange_terracotta', '#9e4f1b'], ['magenta_terracotta', '#97586b'],
    ['light_blue_terracotta', '#706b88'], ['yellow_terracotta', '#b88419'], ['lime_terracotta', '#627029'],
    ['pink_terracotta', '#9e4a49'], ['gray_terracotta', '#332018'], ['light_gray_terracotta', '#886960'],
    ['cyan_terracotta', '#585858'], ['purple_terracotta', '#784454'],
  ]),
  ...blocks('concrete', [
    ['white_concrete', '#d0d6d7'], ['orange_concrete', '#e26100'], ['magenta_concrete', '#aa2da0'],
    ['light_blue_concrete', '#1e88c6'], ['yellow_concrete', '#f3b10d'], ['lime_concrete', '#5fab12'],
    ['pink_concrete', '#d6648f'], ['gray_concrete', '#33373b'], ['light_gray_concrete', '#7f7f75'],
    ['cyan_concrete', '#0f798a'], ['blue_concrete', '#282a90'], ['purple_concrete', '#64199d'],
    ['green_concrete', '#485b1f'], ['brown_concrete', '#613a1a'], ['red_concrete', '#901d1d'],
    ['black_concrete', '#010205'],
  ]),
  ...blocks('glass', [
    ['white_stained_glass', '#f7f8f8'], ['orange_stained_glass', '#dea877'], ['magenta_stained_glass', '#c78adf'],
    ['light_blue_stained_glass', '#99b8df'], ['yellow_stained_glass', '#e7e877'], ['lime_stained_glass', '#a7d867'],
    ['pink_stained_glass', '#f0a8bf'], ['light_gray_stained_glass', '#898a8a'], ['cyan_stained_glass', '#89a8b8'],
    ['purple_stained_glass', '#a77ec8'], ['blue_stained_glass', '#697cc5'], ['brown_stained_glass', '#998a77'],
    ['green_stained_glass', '#99a877'], ['red_stained_glass', '#a44949'], ['black_stained_glass', '#666767'],
  ], true),
  ...blocks('gray', [
    ['white_wool', '#e9ecec'], ['gray_wool', '#3e4447'], ['black_wool', '#141519'],
    ['light_gray_wool', '#8e8e86'], ['white_terracotta', '#d2b4a1'], ['gray_terracotta', '#332018'],
    ['light_gray_terracotta', '#886960'], ['cyan_terracotta', '#585858'], ['black_terracotta', '#1b0c04'],
    ['white_concrete', '#d0d6d7'], ['gray_concrete', '#33373b'], ['light_gray_concrete', '#7f7f75'],
    ['black_concrete', '#010205'], ['stone', '#7c7c7c'],
  ]),
]

export function activePalette(families: ReadonlySet<PaletteFamily>): PaletteBlock[] {
  return PALETTE.filter((block) => families.has(block.family))
}

export function nearestBlock(
  red: number,
  green: number,
  blue: number,
  alpha: number,
  blocks: readonly PaletteBlock[],
  mode: ColorMode = 'lab',
): PaletteBlock {
  if (blocks.length === 0) {
    throw new Error('Select at least one block family')
  }

  const wantsTransparent = alpha < 200
  const preferred = blocks.filter((block) => block.transparent === wantsTransparent)
  const candidates = preferred.length > 0 ? preferred : blocks
  let nearest = candidates[0]!
  let nearestDistance = Number.POSITIVE_INFINITY

  for (const block of candidates) {
    const distance = colorDistance(mode, [red, green, blue], block.rgb)

    if (distance < nearestDistance) {
      nearest = block
      nearestDistance = distance
    }
  }

  return nearest
}
