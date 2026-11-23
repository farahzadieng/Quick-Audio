# Quick Audio Tools — Developer / Agent Guide

> **Start here for every future modification.** This document maps features to source files, describes the architecture, enumerates known limitations, and gives deployment and verification steps. Last updated: 2026-11-22.

## 1. Product contract

Quick Audio Tools is a **privacy-first, static, client-side web app and PWA** for editing audio metadata and converting audio files. No user audio is uploaded, logged, stored remotely, or sent to an API. Never introduce server-side media processing without explicit user authorization. The only persistence of user choices is browser `localStorage` (saved presets, activity summary, theme). Actual files and cover images are held in browser memory during the open session. The app should remain lightweight, elegant, responsive, and fast.

**Visual identity:** backgrounds `#edede9`, cards/sections `#d6ccc2` (used subtly), primary `#d5bdaf`, accent `#e3d5ca`; better-contrast variants and darker ink are defined as CSS variables. Heading font: **Libre Baskerville** via Google Fonts with system Baskerville/Georgia fallback. Body/inputs: system sans-serif for legibility. Strict corners on PWA icon image; OS handles rounding. Theme selection supports system, light, and dark modes; an explicit choice is stored locally. Assets in `public/icons` are derived from approved logo, text-free.

## 2. Quick start

Requires Node.js >=20.19 and an npm connection for initial installation.

```bash
npm install
npm run dev
npm test
npm run lint
npm run format:check
npm run build
npm run preview
```

The `postinstall` script copies `ffmpeg-core.js` and `ffmpeg-core.wasm` from `node_modules/@ffmpeg/core/dist/esm/` to `public/ffmpeg/`. These are self-hosted at **the same origin**, so no CDN and no remote conversion service are required. Assets in `public/ffmpeg` are generated and deliberately excluded from source archive and git. **Do not remove `postinstall`** or conversion will fail at runtime. If package installation uses `--ignore-scripts`, run `node scripts/copy-ffmpeg.mjs` manually.

Build output is `dist/`. For **Cloudflare Pages**, choose Framework: Vite, Build command: `npm run build`, Build output directory: `dist`, Node 22 recommended. The `public/_headers` file sets security headers and the `.wasm` MIME type. The `public/_redirects` file provides SPA fallback (static files such as `/privacy.html` take precedence). Deploy static `dist` assets only. No worker function, API key, database, or secrets are needed.

The repository includes `package-lock.json`. Use `npm ci` in CI for reproducible installation, and run the verification commands below before deployment. The build and browser checks performed on 2026-11-23 are summarized in section 11; additional conversion formats and mobile browser behavior still need validation.

## 3. Source map — where to edit what

| Feature                                                                                                | Location                                                   | Notes                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App composition, tool switching, file queue, processing orchestration, metadata form, download UI, FAQ | `src/App.jsx`                                              | Top-level React state; `processFiles()` controls jobs and uses separate conversion writer.                                                              |
| Styling, palette, typography, dark theme, responsive layouts                                           | `src/styles.css`                                           | CSS variables at file top, `[data-theme=dark]` overrides, mobile media queries at end.                                                                  |
| Header, file list, metadata details                                                                    | `src/components/Header.jsx`, `FileList.jsx`, `Details.jsx` | UI modules for the main app.                                                                                                                            |
| FAQ copy                                                                                               | `src/content/faq.js`                                       | User-facing answers.                                                                                                                                    |
| Multi-select files / drag-and-drop                                                                     | `src/components/DropZone.jsx`                              | `multiple` file input and drag handlers, accepts common audio suffixes.                                                                                 |
| File status / progress bars                                                                            | `src/components/Progress.jsx`                              | Per-file status: reading, ready, working, done, error.                                                                                                  |
| Metadata text/textarea widget                                                                          | `src/components/Field.jsx`                                 | Used by all editable fields.                                                                                                                            |
| Field catalogue, labels, metadata mapping / filenames                                                  | `src/audio/fields.js`                                      | Add regular tag fields here FIRST; update ID3 and/or FFmpeg mappings as appropriate.                                                                    |
| Read music metadata / cover / duration                                                                 | `src/audio/metadata.js`                                    | Lazy imports `music-metadata` using `parseBlob()`.                                                                                                      |
| MP3 ID3v2.3 write, TXXX, APIC, Unicode, frame preservation                                             | `src/audio/id3.js`                                         | Does NOT re-encode MP3; preserves opaque ID3v2.3 frames where safe. Add new ID3 frame mappings to `FRAME`.                                              |
| Audio converter, format list, metadata stream-copy remux                                               | `src/audio/converter.js`                                   | Lazy loads FFmpeg in its own Web Worker via `@ffmpeg/ffmpeg`. `OUTPUT_FORMATS` defines codecs and extensions.                                           |
| Blob downloads, ZIP bundle                                                                             | `src/audio/export.js`                                      | Browser Blob URLs, fflate ZIP (store compression).                                                                                                      |
| Browser-only preferences, favorite presets and recent operation history                                | `src/audio/storage.js`                                     | `localStorage`; never store media bytes here.                                                                                                           |
| Service worker, installable PWA, offline asset cache                                                   | `vite.config.js`                                           | `vite-plugin-pwa`. FFmpeg core cache is on-demand rather than preloaded to preserve initial load speed.                                                 |
| FFmpeg static-asset copying                                                                            | `scripts/copy-ffmpeg.mjs`                                  | Run after each fresh `npm install`.                                                                                                                     |
| SEO markup, OpenGraph, Twitter, schema.org WebApplication                                              | `index.html`                                               | Add canonical URL and sitemap only when final production domain is known. Static landing copy is present in index.html for crawlers without JavaScript. |
| Robots directives                                                                                      | `public/robots.txt`                                        | Crawlers allowed.                                                                                                                                       |
| Public privacy policy                                                                                  | `public/privacy.html`                                      | Static, indexable disclosure of on-device processing and local preferences; set a contact and effective date for production.                            |
| Web security headers                                                                                   | `public/_headers`                                          | Content Security Policy allows WASM compilation and local/blob workers.                                                                                 |
| Unit tests                                                                                             | `tests/id3.test.js`                                        | Native `node --test` covering ID3 audio preservation and tag writing.                                                                                   |

## 4. Main flow

1. User drags/selects one or multiple local files. `receiveFiles` in `App.jsx` adds status `reading` for each.
2. `readMetadata(file)` parses audio metadata and artwork locally. Updates UI status `ready`; decoding failure still allows limited manual metadata edits/conversion.
3. Tag Editor: select one file for individual editing, or enable Batch edit and fill only shared values. Empty fields in batch are not applied. The form has essentials, credits, notes, plus arbitrary custom TXXX metadata.
4. Favorite star opens saved metadata presets. Each is a value snapshot stored in `localStorage`. Favorites contain **no audio data**. Activity history contains operation type and number of files, not file names.
5. `processFiles()` executes one file at a time to avoid memory spikes. For MP3 in tag mode, `writeMp3Tags` rewrites ID3 frames and copies MPEG payload unmodified. For FLAC/M4A/OGG/WAV/Opus tag mode, FFmpeg stream-copies audio while applying metadata. For conversion mode, FFmpeg transcodes to the selected format and bitrate.
6. Each job publishes steps and percentages to progress bars. `Stop after current file` prevents starting further jobs; it cannot forcibly terminate an in-progress FFmpeg job. Completed jobs are downloadable individually or as ZIP.
7. `vite-plugin-pwa` caches app shell and static code. FFmpeg core assets are cached when first used, enabling later offline conversions as long as cached assets remain.

## 5. Supported formats, capabilities and honest limitations

- MP3: Read metadata; write/edit ID3v2.3 title, artist, album, track/disc numbers, credits, comments, lyrics, album artwork, and custom TXXX. Audio data is not re-encoded. The writer preserves unknown **ID3v2.3** frames if not overridden and not flagged as compressed/encrypted. **ID3v2.4 and ID3v2.2 raw frame preservation is not implemented**; never promise lossless preservation of every exotic native frame. If this requirement arises, implement proper cross-version mapping and tests.
- FLAC, M4A, OGG, Opus, WAV: Parsed using `music-metadata`; metadata modifications are remuxed using FFmpeg `-c:a copy` (not re-encoded). Container/codec limitations can reject some metadata fields or artwork; FFmpeg's muxer determines actual persistence. Verify by re-reading the output.
- Conversion formats: MP3, WAV, FLAC, M4A/AAC, OGG/Vorbis, Opus. FFmpeg codec availability must be validated with real fixture files after installation. Some high-complexity formats or artwork combinations may fail; errors display per file rather than pretending success.
- `Quick Audio Tools` is optimized for modest mobile files (~10 MB typical). This is a **usage goal**, not a measured maximum. There is deliberately no hard size rejection for desktop. Show a caution for large mobile files before adding hard caps.
- Conversion progress is FFmpeg's reported fraction; 0–100 is approximate. Loading the engine is a distinct step.
- Initial installation requires internet. Offline can function after the needed scripts and FFmpeg core have been cached; browser cache eviction and storage limits apply. The Google Font has local system fallbacks if offline.
- No automated loudness normalization, silence trimming, audio waveform rendering, OCR, remote tag lookup, account syncing, cloud backup, or background processing while the browser is closed. Do not claim those capabilities in marketing.
- Safari and Firefox compatibility must be tested manually. The single-thread FFmpeg core is preferred for broader compatibility without Cross-Origin Isolation headers.

## 6. Add a new metadata field

1. Add `[fieldKey, 'Readable Label']` to the appropriate section in `FIELD_GROUPS` in `src/audio/fields.js`.
2. In `src/audio/fields.js:normalizeTags` map any non-trivial `music-metadata.common` output for that field.
3. Add the ID3v2.3 frame mapping to `FRAME` or `CUSTOM` in `src/audio/id3.js`; avoid duplicating frames with the same ID. For a nonstandard field, prefer a `TXXX` descriptor.
4. If desired for non-MP3 outputs, add the FFmpeg `-metadata` mapping to `commonMetadata` in `src/audio/converter.js`.
5. Add a test to `tests/id3.test.js` and verify output by round-tripping with a real audio sample in MP3 plus at least one different container.

## 7. Add or modify an output audio format

1. Add an entry to `OUTPUT_FORMATS` with `value`, human label, MIME type and encoder name.
2. Update `outputOptions` bitrate handling and any format-specific arguments in `src/audio/converter.js`.
3. Update the extension whitelist in `src/components/DropZone.jsx`, `receiveFiles` in `src/App.jsx`, and tag-remux restrictions as appropriate.
4. Validate the bundled FFmpeg wasm contains the requested encoder; merely adding a label will not enable a missing codec.
5. Run desktop Chrome, Android Chrome, macOS Firefox, and iOS Safari checks using real audio fixtures. Pay attention to RAM, output duration and player compatibility.

## 8. SEO checklist / content guide

- App title, descriptions, OG and Twitter metadata, `WebApplication` JSON-LD already exist in `index.html`.
- Page contains semantic content: H1, H2, file-workspace labels, how-to, and FAQ answers in `src/App.jsx`.
- SEO search intent targets **online MP3 tag editor**, **edit audio metadata**, **batch MP3 tags**, **private audio converter**, **on-device audio conversion**, **offline audio tools**, **no upload audio editor**. Avoid keyword stuffing, unsupported claims, or copying sample-site copy verbatim.
- Once production domain is chosen, add absolute canonical URL, correct `og:url` and `og:image` URLs, and a domain-specific sitemap. Avoid indexing duplicate staging URLs. Confirm robots.txt and submit the resulting sitemap to Google Search Console.
- Google generally renders client-side JS, but for stronger SEO consider static prerender/SSG of explanatory landing content while retaining a client-only editor workspace. This is not currently implemented.
- Offline copy means previously cached resources; don't imply first-ever use with no internet.

## 9. Tests that MUST run before production

Automated (once npm is available):

```bash
npm install
npm test
npm run lint
npm run format:check
npm run build
```

Manual E2E acceptance matrix:

1. Desktop Chrome/Firefox and iPhone Safari / Android Chrome: load, use light/dark themes, add 1 and 3 files via picker and drag/drop (drag/drop mainly desktop).
2. MP3 with ID3v2.3 tags + artwork: edit title, Arabic/Persian Unicode, lyrics, album artwork, custom TXXX. Download; reopen and verify tags; audio frame bytes should match original.
3. MP3 with ID3v2.4 and ID3v1: confirm expected limitations and no corruption; add regression tests before enabling broader support.
4. Batch edit MP3 album artist across 3 files; ensure track-specific values remain unchanged, and downloaded ZIP contains all files.
5. Convert fixtures MP3→WAV, WAV→MP3, FLAC→MP3, MP3→FLAC, M4A→OGG, OGG→Opus; compare output duration and playback, inspect metadata.
6. Retag FLAC and M4A with cover: verify whether target container accepts the artwork; if unsupported, UI must disclose limitations.
7. Cancel after current file; complete previous files downloadable. Retry after an error.
8. Save a favorite preset, refresh, load it. Refresh and inspect history: filenames must not appear.
9. Install PWA; after first conversion, disconnect network and retest the same conversion; check browser cache storage limits.
10. Browser developer tools: confirm that file contents are never sent in network requests. Run Lighthouse performance/accessibility/SEO/PWA checks.
11. Test a 10 MB input on low-memory iPhone Safari. Record actual conversion memory/time; do not invent performance claims.

## 10. Security and privacy review

- Avoid uploading audio to analytics, exception trackers, remote APIs or CDNs. Code packages are bundled into the build and FFmpeg core is hosted at same origin.
- Current font uses Google Fonts, which sends standard resource requests to Google; this does not send audio files. For a strict zero-third-party-network product, self-host the font and update the CSP.
- Avoid `dangerouslySetInnerHTML` and execute no commands from user-supplied filenames. FFmpeg file paths are internally generated by numerical job ID; metadata is passed as separate argument values.
- `localStorage` contains only preset values and aggregate history. These are not encrypted; do not store secret user information in presets.
- Static CSP is in `_headers`, and WebAssembly uses `'wasm-unsafe-eval'`. Do not loosen CSP without a clear reason.
- Cover blobs are handled locally. Download URLs are revoked after use.
- Third-party dependencies should be audited after npm install (`npm audit` and security updates), especially FFmpeg wasm binaries.

## 11. Current project status

- Implemented: frontend, responsive editor, tag form and custom metadata fields, multi-file input/drag-drop, local favorites/history, system/light/dark theme selector, localized ID3 MP3 writer, FFmpeg converter integration, multi-output ZIP, progress indicators, PWA manifest/offline caching configuration, SEO metadata and privacy copy, tests, development scripts.
- **Verified locally (2026-11-23):** npm lint, Prettier check, Node ID3 tests, Vite production build; browser load, theme selection/persistence, mobile layout, WAV metadata reading, and MP3 tag writing/download readiness.
- **Conversion verified locally (2026-11-23):** WAV to MP3 completed in the browser; the downloaded file was parsed as MPEG Layer 3 with a duration of about 1.07 seconds. Vite excludes `@ffmpeg/ffmpeg` from dependency prebundling so its worker URL remains valid in development. The self-hosted ESM core is loaded through blob URLs to avoid Vite treating `public/` files as source modules. The Cloudflare CSP permits blob scripts and blob fetches for this worker import. A production build was also verified under the same CSP on a fresh local origin. A 120-second engine startup timeout reports an error if initialization stalls.
- **Still needs device validation:** Test the other format pairs and desktop Chrome, Firefox, Safari, and mobile browsers with real fixtures before claiming full conversion support. PWA offline behavior and Cloudflare deployment were not tested.
- **Planned refinements:** preserving arbitrary exotic ID3v2.4 frames; showing existing custom user-defined native tags; per-muxer artwork feature detection; worker-based ID3 reads; static prerendering for strongest SEO; genuine Playwright browser tests on fixtures.
