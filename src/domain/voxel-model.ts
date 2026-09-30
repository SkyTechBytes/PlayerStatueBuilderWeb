export type BlockId = `minecraft:${string}`

export interface Voxel {
  x: number
  y: number
  z: number
  block: BlockId
  color: string
}

export interface Bounds {
  x: number
  y: number
  z: number
}

export type VoxelMap = Map<string, Voxel>

export function voxelKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`
}

export function getBounds(voxels: Iterable<Voxel>): Bounds {
  let x = 0
  let y = 0
  let z = 0

  for (const voxel of voxels) {
    x = Math.max(x, voxel.x + 1)
    y = Math.max(y, voxel.y + 1)
    z = Math.max(z, voxel.z + 1)
  }

  return { x, y, z }
}
