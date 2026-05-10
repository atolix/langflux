# langflux

Generate a GitHub language profile SVG from a public user's repositories.

<img width="504" height="224" alt=" 2026-05-10 20 39 08" src="https://github.com/user-attachments/assets/c5c0d058-cb0c-4111-a5b6-ce23d3bd728a" />

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
