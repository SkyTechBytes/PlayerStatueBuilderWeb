export type SkinModel = 'classic' | 'slim'
export type SkinModelChoice = 'auto' | SkinModel
export type FaceName = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'

export interface UvRect {
  x: number
  y: number
  width: number
  height: number
}

export interface PartLayout {
  name: string
  origin: readonly [number, number, number]
  size: readonly [number, number, number]
  base: Record<FaceName, UvRect>
  outer?: Record<FaceName, UvRect>
}

function faces(
  top: UvRect,
  bottom: UvRect,
  right: UvRect,
  front: UvRect,
  left: UvRect,
  back: UvRect,
): Record<FaceName, UvRect> {
  return { top, bottom, right, front, left, back }
}

function rect(x: number, y: number, width: number, height: number): UvRect {
  return { x, y, width, height }
}

const head: PartLayout = {
  name: 'Head',
  origin: [4, 24, 0],
  size: [8, 8, 8],
  base: faces(rect(8, 0, 8, 8), rect(16, 0, 8, 8), rect(0, 8, 8, 8), rect(8, 8, 8, 8), rect(16, 8, 8, 8), rect(24, 8, 8, 8)),
  outer: faces(rect(40, 0, 8, 8), rect(48, 0, 8, 8), rect(32, 8, 8, 8), rect(40, 8, 8, 8), rect(48, 8, 8, 8), rect(56, 8, 8, 8)),
}

const torso: PartLayout = {
  name: 'Torso',
  origin: [4, 12, 2],
  size: [8, 12, 4],
  base: faces(rect(20, 16, 8, 4), rect(28, 16, 8, 4), rect(16, 20, 4, 12), rect(20, 20, 8, 12), rect(28, 20, 4, 12), rect(32, 20, 8, 12)),
  outer: faces(rect(20, 32, 8, 4), rect(28, 32, 8, 4), rect(16, 36, 4, 12), rect(20, 36, 8, 12), rect(28, 36, 4, 12), rect(32, 36, 8, 12)),
}

const rightLeg: PartLayout = {
  name: 'Right leg',
  origin: [4, 0, 2],
  size: [4, 12, 4],
  base: faces(rect(4, 16, 4, 4), rect(8, 16, 4, 4), rect(0, 20, 4, 12), rect(4, 20, 4, 12), rect(8, 20, 4, 12), rect(12, 20, 4, 12)),
  outer: faces(rect(4, 32, 4, 4), rect(8, 32, 4, 4), rect(0, 36, 4, 12), rect(4, 36, 4, 12), rect(8, 36, 4, 12), rect(12, 36, 4, 12)),
}

const leftLeg: PartLayout = {
  name: 'Left leg',
  origin: [8, 0, 2],
  size: [4, 12, 4],
  base: faces(rect(20, 48, 4, 4), rect(24, 48, 4, 4), rect(16, 52, 4, 12), rect(20, 52, 4, 12), rect(24, 52, 4, 12), rect(28, 52, 4, 12)),
  outer: faces(rect(4, 48, 4, 4), rect(8, 48, 4, 4), rect(0, 52, 4, 12), rect(4, 52, 4, 12), rect(8, 52, 4, 12), rect(12, 52, 4, 12)),
}

function arms(model: SkinModel): PartLayout[] {
  const width = model === 'slim' ? 3 : 4
  const rightX = model === 'slim' ? 1 : 0
  const leftX = model === 'slim' ? 12 : 12
  const frontX = model === 'slim' ? 44 : 44
  const leftFaceX = frontX + width
  const backX = leftFaceX + 4
  const leftFrontX = 36
  const leftLeftX = leftFrontX + width
  const leftBackX = leftLeftX + 4

  return [
    {
      name: 'Right arm',
      origin: [rightX, 12, 2],
      size: [width, 12, 4],
      base: faces(rect(44, 16, width, 4), rect(44 + width, 16, width, 4), rect(40, 20, 4, 12), rect(frontX, 20, width, 12), rect(leftFaceX, 20, 4, 12), rect(backX, 20, width, 12)),
      outer: faces(rect(44, 32, width, 4), rect(44 + width, 32, width, 4), rect(40, 36, 4, 12), rect(frontX, 36, width, 12), rect(leftFaceX, 36, 4, 12), rect(backX, 36, width, 12)),
    },
    {
      name: 'Left arm',
      origin: [leftX, 12, 2],
      size: [width, 12, 4],
      base: faces(rect(36, 48, width, 4), rect(36 + width, 48, width, 4), rect(32, 52, 4, 12), rect(leftFrontX, 52, width, 12), rect(leftLeftX, 52, 4, 12), rect(leftBackX, 52, width, 12)),
      outer: faces(rect(52, 48, width, 4), rect(52 + width, 48, width, 4), rect(48, 52, 4, 12), rect(52, 52, width, 12), rect(52 + width, 52, 4, 12), rect(56 + width, 52, width, 12)),
    },
  ]
}

export function getSkinLayout(model: SkinModel): PartLayout[] {
  return [rightLeg, leftLeg, torso, head, ...arms(model)]
}
