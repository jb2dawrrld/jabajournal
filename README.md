# Jabajournal

Jabajournal is a React + Vite journaling app backed by Supabase, with an optional Tauri desktop shell for Windows and macOS.

## Local setup

1. Install Node.js 22+.
2. Install Rust if you want to run or package the Tauri desktop app.
3. Copy `.env.example` to `.env`.
4. Set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_ORIGIN` if you want to override the detected app origin
5. Run:

```bash
npm install
npm run dev
```

For the desktop shell:

```bash
npm run tauri dev
```

## Supabase auth configuration

For local Tauri development:

- Site URL: `http://localhost:1420`
- Redirect URLs:
  - `http://localhost:1420/**`
  - `http://localhost:1420/auth`

For production:

- Site URL: `https://jabajournal.com`
- Redirect URLs:
  - `https://jabajournal.com/**`
  - Add `https://www.jabajournal.com/**` only if that hostname is active

## Scripts

- `npm run dev` - local Vite dev server
- `npm test` - Vitest test suite
- `npm run test:coverage` - test suite with coverage
- `npm run typecheck` - TypeScript typecheck only
- `npm run build` - production web build
- `npm run tauri dev` - local Tauri desktop app
- `npm run tauri:build` - packaged Tauri desktop build

## Deployment notes

- Web hosting is configured for Vercel.
- SPA routing is handled by `vercel.json` and rewrites all routes to `index.html`.
- Production requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel project settings.
- A release checklist lives in `docs/release-checklist.md`.

## GitHub Actions

- `.github/workflows/ci.yml` runs tests and builds on Ubuntu, Windows, and macOS.
- `.github/workflows/deploy-web.yml` deploys the web app to Vercel on version tags or manual dispatch.
- `.github/workflows/release-desktop.yml` builds Windows and macOS Tauri releases on version tags.
