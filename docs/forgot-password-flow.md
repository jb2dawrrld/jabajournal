# Forgot-password flow

Step-by-step path a user follows to reset their jabajournal password, and what the app does at each step.

## Routes

| Route | Purpose |
| --- | --- |
| `/auth` | Sign in / sign up; links to forgot password |
| `/forgot-password` | Enter email and request a reset link |
| `/forgot-password/sent` | Confirmation that an email was sent |
| `/reset-password` | Choose a new password after opening the email link |

## User steps

### 1. Open forgot password from sign in

1. Go to `/auth` (sign-in mode).
2. Click **Forgot password?**
3. The app navigates to `/forgot-password`.

No email is sent yet.

### 2. Request a reset link

1. On `/forgot-password`, enter the account email.
2. Click **Send reset link**.
3. The app calls Supabase `resetPasswordForEmail` with:
   - the trimmed, lowercased email
   - `redirectTo` = `{appOrigin}/reset-password` (from `getPasswordResetRedirectUrl()`)
4. On success, the app navigates to `/forgot-password/sent` (replace history).
5. On failure, a generic error is shown (no indication whether the email exists).

Already signed-in users who hit `/forgot-password` are redirected to `/`.

### 3. Confirmation page

1. `/forgot-password/sent` shows that a reset link was sent and to check inbox/spam.
2. There is **no** resend button on this page (limits casual re-clicks; Supabase rate limits still apply).
3. **Back to sign in** returns to `/auth`.

### 4. Open the email link

1. The user opens the recovery email **in the same browser** that requested the reset (recommended for a reliable session).
2. The link hits Supabase Auth verify, for example:

   `https://{project}.supabase.co/auth/v1/verify?token=…&type=recovery&redirect_to=http://localhost:1420/reset-password`

3. Supabase responds with a **303** redirect to the app, typically:

   `http://localhost:1420/reset-password#access_token=…&refresh_token=…&type=recovery`

`redirect_to` must be allowlisted under Supabase **Authentication → URL Configuration → Redirect URLs**.

### 5. Set a new password

1. `/reset-password` loads.
2. The app **snapshots recovery intent** from the URL (`type=recovery` in the hash or query) into `sessionStorage` under `jabajournal_password_recovery`. That flag survives after the client clears the hash.
3. Recovery intent is snapshotted from the URL as early as client load (`sessionStorage`), before Supabase clears the hash.
4. The Supabase client (`detectSessionInUrl`) establishes the recovery session from the hash; the page does **not** call `setSession` again (that raced the auth lock and could hang the loading screen).
5. `AuthContext` also sets the recovery flag on `PASSWORD_RECOVERY`, defers profile work off the auth lock, and skips the full-screen loading gate during recovery.
6. When auth loading is done **and** there is a session **and** recovery intent is set, the user sees **Choose a new password**. Leftover hash is stripped after the session exists.
7. If loading finished but session or recovery intent is missing, the page shows that the link is missing or expired, with links to request a new reset or return to sign in.
8. User enters and confirms a new password (minimum 6 characters) and submits.
9. The app calls `supabase.auth.updateUser({ password })`.
10. On success, recovery intent is **cleared** from `sessionStorage`, a short success message appears, then the user is sent to `/`.

## Sequence (happy path)

```text
/auth
  → /forgot-password          (enter email, send)
  → /forgot-password/sent     (check inbox)
  → email → Supabase verify
  → /reset-password#…type=recovery
  → session + recovery flag
  → update password
  → /
```

## Key files

| File | Role |
| --- | --- |
| `src/pages/AuthPage.tsx` | Link to `/forgot-password` |
| `src/pages/ForgotPasswordPage.tsx` | Email form + `resetPasswordForEmail` |
| `src/pages/ForgotPasswordSentPage.tsx` | “Check your inbox” confirmation |
| `src/pages/ResetPasswordPage.tsx` | Apply recovery tokens + set new password |
| `src/lib/passwordRecovery.ts` | `sessionStorage` recovery intent helpers |
| `src/lib/authRedirect.ts` | Builds `/reset-password` redirect URL |
| `src/contexts/AuthContext.tsx` | `PASSWORD_RECOVERY` flag + no loading gate during recovery |

## Local testing checklist

1. Redirect URL allowlisted (e.g. `http://localhost:1420/reset-password` or `http://localhost:1420/**`).
2. Optional: `VITE_APP_ORIGIN=http://localhost:1420` in `.env`, then restart Vite so emails use localhost.
3. Request reset from the app, confirm the email link’s host matches your local origin.
4. Open the link in the same browser; you should land on **Choose a new password**, not the expired message.
