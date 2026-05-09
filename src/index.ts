import { Hono } from 'hono'
import { escapeHtml } from './escape'
import { getLanguageStats } from './github'
import { createMarbleSvg, MARBLE_SIZE } from './marble'
import { createProfileSvg } from './profile'

type Bindings = {
  GITHUB_TOKEN?: string
}

const app = new Hono<{ Bindings: Bindings }>()

const USERNAME_PATTERN = /^[a-z\d](?:[a-z\d-]{0,38})$/i

const getRandomSeed = () => Math.floor(Math.random() * 1_000_000)

const getUsername = (usernameQuery: string | undefined) => {
  const username = usernameQuery?.trim()

  return username && USERNAME_PATTERN.test(username) ? username : undefined
}

app.get('/', async (c) => {
  const seed = getRandomSeed()
  const username = getUsername(c.req.query('username'))
  if (!username) {
    return c.text('username query is required', 400)
  }

  const languageStats = await getLanguageStats(username, c.env.GITHUB_TOKEN)
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
          grid-template-columns: ${MARBLE_SIZE}px minmax(220px, 300px);
          gap: 28px;
          align-items: center;
          padding: 24px;
        }

        .marble {
          width: ${MARBLE_SIZE}px;
          height: ${MARBLE_SIZE}px;
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
          color: #6e7681;
          text-shadow: 0 1px 8px rgb(0 0 0 / 55%);
        }

        .value {
          color: #6e7681;
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
          ${createMarbleSvg(languageStats, seed)}
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

app.get('/profile.svg', async (c) => {
  const seed = getRandomSeed()
  const username = getUsername(c.req.query('username'))
  if (!username) {
    return c.text('username query is required', 400)
  }

  const languageStats = await getLanguageStats(username, c.env.GITHUB_TOKEN)
  const svg = createProfileSvg(languageStats, seed)

  return c.body(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
})

export default app
