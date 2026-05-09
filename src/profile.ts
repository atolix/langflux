import type { LanguageStat } from './github'
import { CANVAS_SIZE, createCanvasSvg } from './canvas'
import { escapeHtml } from './escape'

const PROFILE_WIDTH = 780
const PROFILE_HEIGHT = 360
const PROFILE_PADDING = 30
const LEGEND_X = 390
const LEGEND_VALUE_X = 735
const LEGEND_START_Y = 95
const LEGEND_ROW_HEIGHT = 44

export const createProfileSvg = (languageStats: LanguageStat[], seed: number) => {
  const legendItems = languageStats
    .map((language, index) => {
      const y = LEGEND_START_Y + index * LEGEND_ROW_HEIGHT

      return `
        <g>
          <circle
            cx="${LEGEND_X}"
            cy="${y}"
            r="10"
            fill="${language.color}"
            stroke="#ffffff"
            stroke-opacity="0.22"
            stroke-width="1"
          />
          <text x="${LEGEND_X + 28}" y="${y + 7}" class="legend-name">
            ${escapeHtml(language.name)}
          </text>
          <text x="${LEGEND_VALUE_X}" y="${y + 7}" text-anchor="end" class="legend-value">
            ${language.percentage.toFixed(1)}%
          </text>
        </g>`
    })
    .join('')

  return `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="${PROFILE_WIDTH}"
    height="${PROFILE_HEIGHT}"
    viewBox="0 0 ${PROFILE_WIDTH} ${PROFILE_HEIGHT}"
    role="img"
    aria-label="GitHub language canvas"
  >
    <defs>
      <clipPath id="canvasClip">
        <rect
          x="${PROFILE_PADDING}"
          y="${PROFILE_PADDING}"
          width="${CANVAS_SIZE}"
          height="${CANVAS_SIZE}"
          rx="12"
          ry="12"
        />
      </clipPath>
      <filter id="canvasShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000000" flood-opacity="0.14" />
      </filter>
      <style>
        .legend-name,
        .legend-value {
          fill: #6e7681;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 24px;
          font-weight: 650;
          letter-spacing: 0;
        }

        .legend-value {
          fill: #6e7681;
          font-variant-numeric: tabular-nums;
        }
      </style>
    </defs>

    <g filter="url(#canvasShadow)">
      <g clip-path="url(#canvasClip)">
        <g transform="translate(${PROFILE_PADDING} ${PROFILE_PADDING})">
          ${createCanvasSvg(languageStats, seed)}
        </g>
      </g>
    </g>

    ${legendItems}
  </svg>
  `
}
