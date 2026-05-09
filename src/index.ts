import { Hono } from 'hono'
import { getLanguageStats } from './github'
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
