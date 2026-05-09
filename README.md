# langflux

Generate a GitHub language profile SVG from a public user's repositories.

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
