type RgbColor = {
  r: number
  g: number
  b: number
}

const hexToRgb = (color: string): RgbColor => {
  const value = color.slice(1)

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  }
}

const rgbToHex = ({ r, g, b }: RgbColor) => {
  const channelToHex = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0')

  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`
}

export const mix = (from: string, to: string, amount: number) => {
  const a = hexToRgb(from)
  const b = hexToRgb(to)

  return rgbToHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  })
}

export const paletteColorAt = (palette: string[], amount: number) => {
  const position = Math.max(0, Math.min(0.999, amount)) * (palette.length - 1)
  const index = Math.floor(position)

  return mix(palette[index], palette[index + 1] ?? palette[index], position - index)
}
