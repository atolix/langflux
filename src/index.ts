import { Hono } from 'hono'
import { LANGUAGE_COLORS } from './github-languages'

type Bindings = {
  GITHUB_TOKEN?: string
}

type LanguageStat = {
  name: string
  color: string
  percentage: number
}

type GitHubRepo = {
  fork: boolean
  languages_url: string
}

type GitHubLanguages = Record<string, number>

const app = new Hono<{ Bindings: Bindings }>()

const SIZE = 300
const PALETTE_SIZE = 6
const OTHER_COLOR = '#8b949e'
const NO_LANGUAGE_INFO = 'No language info'
const GITHUB_API_VERSION = '2022-11-28'
const MAX_REPO_PAGES = 10
const REPOS_PER_PAGE = 100
const EXCLUDE_FORKS = true
const USERNAME_PATTERN = /^[a-z\d](?:[a-z\d-]{0,38})$/i

const getRandomSeed = () => Math.floor(Math.random() * 1_000_000)

const getUsername = (usernameQuery: string | undefined) => {
  const username = usernameQuery?.trim()

  return username && USERNAME_PATTERN.test(username) ? username : undefined
}

const hexToRgb = (color: string) => {
  const value = color.slice(1)

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  }
}

const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const channelToHex = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0')

  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`
}

const mix = (from: string, to: string, amount: number) => {
  const a = hexToRgb(from)
  const b = hexToRgb(to)

  return rgbToHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  })
}

const paletteColorAt = (palette: string[], amount: number) => {
  const position = Math.max(0, Math.min(0.999, amount)) * (palette.length - 1)
  const index = Math.floor(position)

  return mix(palette[index], palette[index + 1] ?? palette[index], position - index)
}

const createRandom = (seed: number) => {
  let value = seed

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

const createGitHubHeaders = (token: string | undefined) => ({
  Accept: 'application/vnd.github+json',
  'User-Agent': 'langflux',
  'X-GitHub-Api-Version': GITHUB_API_VERSION,
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
})

const fetchGitHubJson = async <T>(url: string, token: string | undefined): Promise<T> => {
  const response = await fetch(url, {
    headers: createGitHubHeaders(token),
  })

  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as T
}

const fetchPublicRepos = async (username: string, token: string | undefined) => {
  const repos: GitHubRepo[] = []

  for (let page = 1; page <= MAX_REPO_PAGES; page += 1) {
    const pageRepos = await fetchGitHubJson<GitHubRepo[]>(
      `https://api.github.com/users/${username}/repos?type=owner&sort=updated&direction=desc&per_page=${REPOS_PER_PAGE}&page=${page}`,
      token,
    )

    repos.push(...pageRepos)

    if (pageRepos.length < REPOS_PER_PAGE) {
      break
    }
  }

  return EXCLUDE_FORKS ? repos.filter((repo) => !repo.fork) : repos
}

const fetchRepoLanguages = async (repo: GitHubRepo, token: string | undefined) => {
  try {
    return await fetchGitHubJson<GitHubLanguages>(repo.languages_url, token)
  } catch {
    return {}
  }
}

const createLanguageStats = (languages: GitHubLanguages): LanguageStat[] => {
  const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0)

  if (totalBytes === 0) {
    return []
  }

  const stats = Object.entries(languages)
    .map(([name, bytes]) => ({
      name,
      color: LANGUAGE_COLORS[name] ?? OTHER_COLOR,
      percentage: (bytes / totalBytes) * 100,
    }))
    .sort((a, b) => b.percentage - a.percentage)

  return stats.slice(0, PALETTE_SIZE)
}

const fetchUserLanguageStats = async (username: string, token: string | undefined) => {
  const repos = await fetchPublicRepos(username, token)
  const repoLanguages = await Promise.all(
    repos.map((repo) => fetchRepoLanguages(repo, token)),
  )
  const languageTotals = repoLanguages.reduce<GitHubLanguages>((totals, languages) => {
    for (const [language, bytes] of Object.entries(languages)) {
      totals[language] = (totals[language] ?? 0) + bytes
    }

    return totals
  }, {})

  return createLanguageStats(languageTotals)
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

const createMarbleLines = (palette: string[], seed: number) => {
  const random = createRandom(seed)
  const ribbons = Array.from({ length: 24 }, (_, index) => {
    const y = -45 + index * 14.25 + (random() - 0.5) * 10.5
    const path = createRibbonPath(
      y,
      19.5 + random() * 31.5,
      random() * Math.PI * 2,
      (random() - 0.5) * 10.5,
    )
    const color = mix(paletteColorAt(palette, index / 23), '#ffffff', 0.08)
    const width = 16.5 + random() * 46.5

    return `<path d="${path}" fill="none" stroke="${color}" stroke-width="${width.toFixed(
      1,
    )}" stroke-linecap="round" opacity="${(0.12 + random() * 0.18).toFixed(2)}" />`
  }).join('\n')

  const veins = Array.from({ length: 24 }, () => {
    const y = -80 + random() * (SIZE + 160)
    const path = createRibbonPath(
      y,
      12 + random() * 25.5,
      random() * Math.PI * 2,
      (random() - 0.5) * 16.5,
    )
    const paletteColor = paletteColorAt(palette, random())
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

const createMarbleSvg = (palette: string[], seed: number) => {
  const gradientStops = palette
    .map((color, index) => {
      const offset = palette.length === 1 ? 0 : (index / (palette.length - 1)) * 100

      return `<stop offset="${offset.toFixed(2)}%" stop-color="${color}" />`
    })
    .join('\n')
  const { ribbons, veins } = createMarbleLines(palette, seed)

  return `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="${SIZE}"
    height="${SIZE}"
    viewBox="0 0 ${SIZE} ${SIZE}"
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

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

app.get('/', async (c) => {
  const seed = getRandomSeed()
  const username = getUsername(c.req.query('username'))
  if (!username) {
    return c.text('username query is required', 400)
  }

  const fetchedStats = await fetchUserLanguageStats(username, c.env.GITHUB_TOKEN).catch(() => [])
  const languageStats =
    fetchedStats.length > 0
      ? fetchedStats
      : [{ name: NO_LANGUAGE_INFO, color: OTHER_COLOR, percentage: 100 }]
  const palette = languageStats.map((language) => language.color)
  const legendItems = languageStats
    .map(
      (language) => `
        <li class="legend-item">
          <span class="swatch" style="background:${language.color}"></span>
          <span class="name">${escapeHtml(language.name)}</span>
          <span class="value">${language.percentage.toFixed(1)}%</span>
        </li>`,
    )
    .join('')
  const html = `
  <!doctype html>
  <html lang="ja">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Lang Marble</title>
      <style>
        :root {
          color-scheme: dark;
          background: #0e1117;
          color: #f0f3f6;
          font-family:
            Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        * {
          box-sizing: border-box;
        }

        body {
          min-height: 100vh;
          margin: 0;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 24% 14%, rgb(52 72 92 / 34%), transparent 34%),
            #0e1117;
        }

        main {
          display: grid;
          grid-template-columns: ${SIZE}px minmax(220px, 300px);
          gap: 28px;
          align-items: center;
          padding: 24px;
        }

        .marble {
          width: ${SIZE}px;
          height: ${SIZE}px;
          overflow: hidden;
          border-radius: 10px;
          box-shadow: 0 28px 70px rgb(0 0 0 / 38%);
        }

        .marble svg {
          display: block;
        }

        .legend {
          display: grid;
          gap: 14px;
          margin: 0;
          padding: 0;
          list-style: none;
          font-size: 22px;
          line-height: 1.2;
        }

        .legend-item {
          display: grid;
          grid-template-columns: 18px minmax(0, 1fr) auto;
          gap: 16px;
          align-items: center;
        }

        .swatch {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          box-shadow: 0 0 0 1px rgb(255 255 255 / 14%);
        }

        .name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #f4f7fb;
          text-shadow: 0 1px 8px rgb(0 0 0 / 55%);
        }

        .value {
          color: #e3e8ef;
          font-variant-numeric: tabular-nums;
          text-align: right;
          text-shadow: 0 1px 8px rgb(0 0 0 / 55%);
        }

        @media (max-width: 680px) {
          body {
            place-items: start center;
          }

          main {
            grid-template-columns: 1fr;
            width: 100%;
            max-width: 360px;
            gap: 22px;
          }

          .marble {
            width: 100%;
            height: auto;
            aspect-ratio: 1;
          }

          .marble svg {
            width: 100%;
            height: 100%;
          }

          .legend {
            font-size: 20px;
          }
        }
      </style>
    </head>
    <body>
      <main>
        <div class="marble" aria-hidden="true">
          ${createMarbleSvg(palette, seed)}
        </div>
        <ol class="legend">
          ${legendItems}
        </ol>
      </main>
    </body>
  </html>
  `

  return c.html(html)
})

export default app
