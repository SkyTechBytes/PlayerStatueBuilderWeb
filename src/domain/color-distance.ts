export type ColorMode = 'lab' | 'rgb' | 'absrgb' | 'hsb' | 'hsl'
export type Rgb = readonly [number, number, number]
export type ColorWeights = readonly [number, number, number]

const DEFAULT_WEIGHTS: ColorWeights = [1, 1, 1]

export function colorDistance(
  mode: ColorMode,
  first: Rgb,
  second: Rgb,
  weights: ColorWeights = DEFAULT_WEIGHTS,
): number {
  if (mode === 'rgb') {
    return Math.trunc(weightedSquared(first, second, weights))
  }
  if (mode === 'absrgb') {
    return Math.trunc(
      Math.abs(first[0] - second[0]) * weights[0]
      + Math.abs(first[1] - second[1]) * weights[1]
      + Math.abs(first[2] - second[2]) * weights[2],
    )
  }

  const firstComponents = mode === 'lab'
    ? rgbToLab(...first)
    : mode === 'hsb'
      ? rgbToHsb(...first)
      : rgbToHsl(...first)
  const secondComponents = mode === 'lab'
    ? rgbToLab(...second)
    : mode === 'hsb'
      ? rgbToHsb(...second)
      : rgbToHsl(...second)
  const scale = 1_000
  const distance = weightedSquared(
    [firstComponents[0] * scale, firstComponents[1] * scale, firstComponents[2] * scale],
    [secondComponents[0] * scale, secondComponents[1] * scale, secondComponents[2] * scale],
    weights,
  )
  return mode === 'lab' ? distance : Math.trunc(distance)
}

function weightedSquared(first: Rgb, second: Rgb, weights: ColorWeights): number {
  return (first[0] - second[0]) ** 2 * weights[0]
    + (first[1] - second[1]) ** 2 * weights[1]
    + (first[2] - second[2]) ** 2 * weights[2]
}

function rgbToHsb(red: number, green: number, blue: number): Rgb {
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  const brightness = maximum / 255
  const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum
  if (saturation === 0) return [0, saturation, brightness]

  const difference = maximum - minimum
  const redComponent = (maximum - red) / difference
  const greenComponent = (maximum - green) / difference
  const blueComponent = (maximum - blue) / difference
  let hue = red === maximum
    ? blueComponent - greenComponent
    : green === maximum
      ? 2 + redComponent - blueComponent
      : 4 + greenComponent - redComponent
  hue /= 6
  if (hue < 0) hue += 1
  return [hue, saturation, brightness]
}

function rgbToHsl(red: number, green: number, blue: number): Rgb {
  const normalizedRed = red / 255
  const normalizedGreen = green / 255
  const normalizedBlue = blue / 255
  const maximum = Math.max(normalizedRed, normalizedGreen, normalizedBlue)
  const minimum = Math.min(normalizedRed, normalizedGreen, normalizedBlue)
  const difference = maximum - minimum
  const lightness = (maximum + minimum) / 2
  if (difference === 0) return [0, 0, lightness]

  const saturation = lightness > 0.5
    ? difference / (2 - maximum - minimum)
    : difference / (maximum + minimum)
  let hue = maximum === normalizedRed
    ? (normalizedGreen - normalizedBlue) / difference + (normalizedGreen < normalizedBlue ? 6 : 0)
    : maximum === normalizedGreen
      ? (normalizedBlue - normalizedRed) / difference + 2
      : (normalizedRed - normalizedGreen) / difference + 4
  hue /= 6
  return [hue, saturation, lightness]
}

export function rgbToLab(red: number, green: number, blue: number): Rgb {
  const normalizedRed = red / 255
  const normalizedGreen = green / 255
  const normalizedBlue = blue / 255
  const x = (normalizedRed * 0.4124564 + normalizedGreen * 0.3575761 + normalizedBlue * 0.1804375) * 100 / 95.047
  const y = (normalizedRed * 0.2126729 + normalizedGreen * 0.7151522 + normalizedBlue * 0.0721750) * 100 / 100
  const z = (normalizedRed * 0.0193339 + normalizedGreen * 0.1191920 + normalizedBlue * 0.9503041) * 100 / 108.883
  const transformedX = labTransform(x)
  const transformedY = labTransform(y)
  const transformedZ = labTransform(z)
  return [
    116 * transformedY - 16,
    500 * (transformedX - transformedY),
    200 * (transformedY - transformedZ),
  ]
}

function labTransform(value: number): number {
  const threshold = (6 / 29) ** 3
  return value > threshold ? Math.cbrt(value) : (1 / 3) * (29 / 6) ** 2 * value + 4 / 29
}
