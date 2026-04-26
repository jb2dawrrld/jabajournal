# Release Checklist

## Production config

- Set `VITE_SUPABASE_URL` in Vercel for Production, Preview, and Development.
- Set `VITE_SUPABASE_ANON_KEY` in Vercel for Production, Preview, and Development.
- Redeploy after changing environment variables.
- In Supabase, set Site URL to `https://jabajournal.com`.
- In Supabase, add `https://jabajournal.com/**` to Redirect URLs.
- Add `https://www.jabajournal.com/**` only if `www` is active.

## Verification

- Open `https://jabajournal.com/auth` and confirm the missing-env fallback is gone.
- Sign in successfully.
- Trigger a password reset email and confirm it lands on `/reset-password`.
- Verify calendar navigation and journal editing on phone, tablet, and laptop widths.
- Verify audio recording fallback behavior in at least one Chromium browser and Safari if available.

## Release automation

- Confirm `npm test` passes.
- Confirm `npm run build` passes.
- Confirm GitHub Actions CI passes on Ubuntu, Windows, and macOS.
- For a desktop release tag, confirm Windows and macOS installers are attached to the GitHub release.
