# langflux

Generate a GitHub language profile SVG from a public user's repositories.

<img width="528" height="262" alt="screenshot-20260927-134419" src="https://github.com/user-attachments/assets/5558f0bf-5079-4b06-898e-e656c6bb2afe" />


## Usage

```md
![Language canvas](https://your-worker.example.com/profile.svg?username=<username>)
```

Replace `<username>` with the GitHub username you want to render.

To use the full GitHub profile README width, add the `full` query parameter:

```md
![Language canvas](https://your-worker.example.com/profile.svg?username=<username>&full)
```

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
