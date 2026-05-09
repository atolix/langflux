import { mix, paletteColorAt } from './color'

export const MARBLE_SIZE = 300

type LanguageColorWeight = {
  color: string
  percentage: number
}

const createRandom = (seed: number) => {
  let value = seed

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

const createWeightedPalette = (colors: LanguageColorWeight[]) => {
  const totalPercentage = colors.reduce((sum, color) => sum + color.percentage, 0)
  let offset = 0

  return colors.map((color) => {
    const weight = totalPercentage > 0 ? color.percentage / totalPercentage : 1 / colors.length
    const start = offset

    offset += weight

    return {
      color: color.color,
      start,
      end: offset,
    }
  })
}

const createGradientStops = (palette: ReturnType<typeof createWeightedPalette>) =>
  palette
    .map((color) => {
      const center = Math.max(0, Math.min(100, ((color.start + color.end) / 2) * 100))

      return `<stop offset="${center.toFixed(2)}%" stop-color="${color.color}" />`
    })
    .join('\n')

const colorAtWeight = (
  palette: ReturnType<typeof createWeightedPalette>,
  amount: number,
) => {
  const position = Math.max(0, Math.min(0.999, amount))
  const color = palette.find((item) => position >= item.start && position < item.end)

  return color?.color ?? palette.at(-1)?.color ?? '#8b949e'
}

const createRibbonPath = (
  y: number,
  amplitude: number,
  phase: number,
  drift: number,
) => {
  const points = Array.from({ length: 9 }, (_, index) => {
    const x = -45 + index * 48.75
    const wave =
      Math.sin(index * 0.95 + phase) * amplitude +
      Math.sin(index * 1.85 + phase * 0.72) * amplitude * 0.36

    return { x, y: y + wave + index * drift }
  })

  return points
    .map((point, index) => {
      if (index === 0) {
        return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
      }

      const previous = points[index - 1]
      const controlDistance = (point.x - previous.x) * 0.55

      return `C ${(previous.x + controlDistance).toFixed(1)} ${previous.y.toFixed(1)}, ${(
        point.x - controlDistance
      ).toFixed(1)} ${point.y.toFixed(1)}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
    })
    .join(' ')
}

const createMarbleLines = (
  weightedPalette: ReturnType<typeof createWeightedPalette>,
  seed: number,
) => {
  const random = createRandom(seed)
  const palette = weightedPalette.map((color) => color.color)
  const ribbons = Array.from({ length: 24 }, (_, index) => {
    const y = -45 + index * 14.25 + (random() - 0.5) * 10.5
    const path = createRibbonPath(
      y,
      19.5 + random() * 31.5,
      random() * Math.PI * 2,
      (random() - 0.5) * 10.5,
    )
    const color = mix(colorAtWeight(weightedPalette, random()), '#ffffff', 0.08)
    const width = 16.5 + random() * 46.5

    return `<path d="${path}" fill="none" stroke="${color}" stroke-width="${width.toFixed(
      1,
    )}" stroke-linecap="round" opacity="${(0.12 + random() * 0.18).toFixed(2)}" />`
  }).join('\n')

  const veins = Array.from({ length: 24 }, () => {
    const y = -80 + random() * (MARBLE_SIZE + 160)
    const path = createRibbonPath(
      y,
      12 + random() * 25.5,
      random() * Math.PI * 2,
      (random() - 0.5) * 16.5,
    )
    const paletteColor = mix(
      colorAtWeight(weightedPalette, random()),
      paletteColorAt(palette, random()),
      0.24,
    )
    const veinColor =
      random() > 0.58
        ? mix(paletteColor, '#ffffff', 0.48)
        : mix(paletteColor, '#24323a', 0.22)
    const width = random() > 0.9 ? 1.5 + random() * 2.1 : 0.35 + random() * 1

    return `<path d="${path}" fill="none" stroke="${veinColor}" stroke-width="${width.toFixed(
      1,
    )}" stroke-linecap="round" opacity="${(0.1 + random() * 0.17).toFixed(2)}" />`
  }).join('\n')

  return { ribbons, veins }
}

export const createMarbleSvg = (colors: LanguageColorWeight[], seed: number) => {
  const weightedPalette = createWeightedPalette(colors)
  const gradientStops = createGradientStops(weightedPalette)
  const { ribbons, veins } = createMarbleLines(weightedPalette, seed)

  return `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="${MARBLE_SIZE}"
    height="${MARBLE_SIZE}"
    viewBox="0 0 ${MARBLE_SIZE} ${MARBLE_SIZE}"
  >
    <defs>
      <linearGradient id="baseGradient" x1="0%" y1="28%" x2="100%" y2="72%">
        ${gradientStops}
      </linearGradient>

      <radialGradient id="polish" cx="34%" cy="24%" r="78%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.26" />
        <stop offset="48%" stop-color="#ffffff" stop-opacity="0.06" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0.22" />
      </radialGradient>

      <filter id="softStone" x="-12%" y="-18%" width="124%" height="136%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.012 0.038"
          numOctaves="5"
          seed="${(seed % 997) + 1}"
          result="stoneNoise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="stoneNoise"
          scale="30"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>

      <filter id="flow" x="-18%" y="-28%" width="136%" height="156%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.009 0.052"
          numOctaves="4"
          seed="${((seed + 31) % 997) + 1}"
          result="flowNoise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="flowNoise"
          scale="46"
          xChannelSelector="R"
          yChannelSelector="B"
        />
      </filter>

      <filter id="softenVeins" x="-18%" y="-28%" width="136%" height="156%">
        <feGaussianBlur stdDeviation="0.7" />
      </filter>

      <filter id="fineGrain" x="0" y="0" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.75"
          numOctaves="2"
          seed="${((seed + 7) % 997) + 1}"
          result="grain"
        />
        <feColorMatrix
          in="grain"
          type="saturate"
          values="0"
        />
        <feComponentTransfer>
          <feFuncA type="table" tableValues="0 0.13" />
        </feComponentTransfer>
      </filter>
    </defs>

    <rect
      width="100%"
      height="100%"
      fill="url(#baseGradient)"
      filter="url(#softStone)"
    />

    <g filter="url(#flow)">
      ${ribbons}
    </g>

    <g filter="url(#softenVeins)">
      <g filter="url(#flow)">
        ${veins}
      </g>
    </g>

    <rect width="100%" height="100%" fill="url(#polish)" />
    <rect width="100%" height="100%" filter="url(#fineGrain)" opacity="0.65" />
  </svg>
  `
}
