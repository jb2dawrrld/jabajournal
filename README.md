# Jabajournal

Desktop journal app (Tauri + React + TypeScript) backed by Supabase. One entry per calendar day in your profile timezone: **today** is editable with autosave; **past days** are read-only.

## Setup

1. **Rust** — Install from [rust-lang.org](https://www.rust-lang.org/tools/install) (required for `npm run tauri dev` / `tauri build`).

2. **Supabase** — Create a project, then either paste [`supabase/migrations/20250405000000_init.sql`](supabase/migrations/20250405000000_init.sql) into the SQL editor, or use the CLI **from this repo** (no global install; Windows-friendly):

   ```bash
   npx supabase login
   npm run db:link -- --project-ref YOUR_PROJECT_REF
   npm run db:push
   ```

   (`supabase` is installed as a devDependency so `npx supabase …` works even when `supabase` is not on your PATH.)

3. **Environment** — Copy `.env.example` to `.env` at the **repo root** and set:

   - `VITE_SUPABASE_URL` — Project URL from **Project Settings → API** (e.g. `https://xxxxx.supabase.co`).
   - `VITE_SUPABASE_ANON_KEY` — The **anon** / **public** key from the same page (often a long `eyJ…` JWT). Restart the dev server after changing `.env`.
   - Optional: **`VITE_APP_ORIGIN`** — Defaults to `http://localhost:1420` in dev. Must match **Authentication → URL Configuration → Site URL** so confirmation emails link back to this app (not `localhost:3000`).

4. **Database migrations** — Apply **both** files under `supabase/migrations/` (`db push` or paste SQL). The second migration adds an INSERT policy on `profiles` so the app can recover if a profile row is missing.

## How auth works

1. The **Sign in / Create account** screen calls Supabase **email + password** (`signInWithPassword` / `signUp`).
2. Supabase returns a **session** (JWT) stored locally by `@supabase/supabase-js` (browser `localStorage` in the Tauri webview).
3. After login, the app loads **`public.profiles`** for your user id (timezone + onboarding flag). New users get a row from the **`handle_new_user`** trigger, or the app **inserts** one if allowed by RLS.
4. If **`onboarding_completed`** is false, you see the onboarding screen; then the **calendar** and **journal** routes.

**Email confirmation:** With **Confirm email** on (**Authentication → User Signups**), sign-up usually returns **no session** until the user clicks the link in email, then **Sign in**. The app shows an info banner after sign-up. Set **Site URL** and **Redirect URLs** as below so links open `http://localhost:1420`, not `localhost:3000`.

### Supabase URL configuration (required for confirmation emails)

In **Authentication → URL Configuration**:

| Field | Local Tauri dev |
|--------|------------------|
| **Site URL** | `http://localhost:1420` |
| **Redirect URLs** | `http://localhost:1420/**` and `http://localhost:1420/auth` |

The app passes **`emailRedirectTo`** = `http://localhost:1420/auth` (or `VITE_APP_ORIGIN/auth`). If **Site URL** is still the default `http://localhost:3000`, the email link will open the wrong port.

## Troubleshooting sign-in

| Symptom | What to check |
|--------|----------------|
| “Invalid API key” / 401 | Wrong `VITE_SUPABASE_ANON_KEY` or URL; use **anon** key, not **service_role**. Restart dev server after editing `.env`. |
| No confirmation email / link goes to :3000 | **URL Configuration** above; **Save** in the dashboard. Check spam. |
| Sign up “works” but no session | **Confirm email** is on—use the link in the email, then **Sign in**. |
| Signed in but stuck / errors loading profile | Run migrations (including `profiles` RLS + `20250405120000_profiles_insert_policy.sql`). |
| Nothing works / network errors | Confirm the Supabase project is not paused and the URL has no typo. |

## Scripts

- `npm run dev` — Vite only (web UI at `http://localhost:1420` when used with Tauri).
- `npm run tauri dev` — Full desktop app with hot reload.
- `npm run build` — Frontend production build.
- `npm run tauri build` — Desktop installers (requires Rust).
- `npm run db:link` / `npm run db:push` / `npm run db:status` — Supabase CLI wrappers (see step 2).

## Privacy

Authentication and Row Level Security ensure each user only accesses their own rows. Use HTTPS (Supabase), keep the **anon** key in the client and the **service role** key out of the app.
