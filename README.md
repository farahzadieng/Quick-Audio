# Quick Audio Tools

Free privacy-first client-side audio tag editor + audio format converter. Designed for Cloudflare Pages and installable as a PWA.

## Run

```bash
npm install
npm run dev
```

Open the Vite address from the console. Full setup, architecture, implementation map, test matrix, offline behavior, and limitations: **[GUIDE.md](GUIDE.md)**.

## Deploy to Cloudflare Pages

Connect repository, choose Vite. Build command: `npm run build`; output directory: `dist`. Runtime: static only, no back-end, no API keys. `npm install` copies the same-origin FFmpeg assets.

## Verification

```bash
npm test
npm run lint
npm run format:check
npm run build
```

See `GUIDE.md` for the manual testing checklist and limitations of the initial implementation.
