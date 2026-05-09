import { LANGUAGE_COLORS } from './github-languages'

export type LanguageStat = {
  name: string
  color: string
  percentage: number
}

type GitHubRepo = {
  fork: boolean
  languages_url: string
}

type GitHubLanguages = Record<string, number>

const PALETTE_SIZE = 6
const OTHER_COLOR = '#8b949e'
const GITHUB_API_VERSION = '2022-11-28'
const MAX_REPO_PAGES = 10
const REPOS_PER_PAGE = 100
const EXCLUDE_FORKS = true

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

  return Object.entries(languages)
    .map(([name, bytes]) => ({
      name,
      color: LANGUAGE_COLORS[name] ?? OTHER_COLOR,
      percentage: (bytes / totalBytes) * 100,
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, PALETTE_SIZE)
}

export const fetchUserLanguageStats = async (
  username: string,
  token: string | undefined,
) => {
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
