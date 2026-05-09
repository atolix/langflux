# langflux

Generate a GitHub language profile SVG from a public user's repositories.

<img width="877" height="465" alt=" 2026-05-10 0 34 55" src="https://github.com/user-attachments/assets/7ed5dcbe-7a9e-4ed6-b72a-e7a6474e41d3" />

## Usage

```md
![Language canvas](https://your-worker.example.com/profile.svg?username=<username>)
```

Replace `<username>` with the GitHub username you want to render.

## Local Development

Create `.dev.vars`:

```txt
GITHUB_TOKEN=your_github_token
```

Then run:

```txt
npm install
npm run dev
```

Open:

```txt
http://localhost:8787/profile.svg?username=<username>
```

## Deploy

Set the GitHub token as a Cloudflare Workers secret:

```txt
npx wrangler secret put GITHUB_TOKEN
```

Then deploy:

```txt
npm run deploy
```
