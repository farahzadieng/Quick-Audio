# Quick Audio Tools

Free privacy-first client-side audio tag editor + audio format converter. Installable as a PWA.

## Run

```bash
npm install
npm run dev
```

Open the Vite address from the console. Full setup, architecture, implementation map, test matrix, offline behavior, and limitations: **[GUIDE.md](GUIDE.md)**.

## Deploy to GitHub Pages with GitHub Actions

The repository includes `.github/workflows/deploy-pages.yml`. In the GitHub repository, open **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**. Then open **Actions → Deploy GitHub Pages → Run workflow** (or push to `main`). The workflow installs dependencies, runs checks, builds the app with `GITHUB_PAGES=true`, and publishes `dist/`. The site will be available at https://farahzadieng.github.io/Quick-Audio/ after the deployment succeeds. No secret or access token needs to be added.

The `GITHUB_PAGES=true` build sets Vite and PWA paths to `/Quick-Audio/`. A normal `npm run build` keeps root-relative paths for other hosts. GitHub Pages serves the 31 MiB FFmpeg WebAssembly asset; Cloudflare Pages and Workers reject this file because each static asset is limited to 25 MiB. Using GitHub Actions to upload the same file to Cloudflare does not bypass that limit. Cloudflare's `_headers` and `_redirects` files do not apply on GitHub Pages.

## Verification

```bash
npm test
npm run lint
npm run format:check
npm run build
```

See `GUIDE.md` for the manual testing checklist and limitations of the initial implementation.
