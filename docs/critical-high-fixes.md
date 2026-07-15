# Critical and high fixes (explained)

This note walks through the **critical** and **high** issues that were fixed in jabajournal: what broke, why it mattered, and why the chosen fix works.

---

## 1. Critical — React Rules of Hooks crash (`JournalPage`)

### What was wrong

`JournalPage` called `useMemo` for `canDelete` **after** several early `return`s (`Navigate` when the date was invalid, in the future, etc.).

React requires every hook to run in the **same order and same count** on every render. When a guard flipped (auth settled, or the route became invalid), the component sometimes returned *before* `useMemo` ran and sometimes ran past it — fewer hooks than React expected.

In production that surfaces as minified **React error #300** (“Rendered fewer hooks than expected”), with a useless stack into the bundled React runtime.

### Why it was critical

This is not a rare edge case. Journal routes constantly move between “loading / valid day / redirect away.” Any of those transitions could crash the page for a real user mid-session.

### How it was fixed

`canDelete`’s `useMemo` was moved **above** all early returns so it always runs, even when the component immediately navigates away.

### Why that works

Hooks are recorded by call position, not by whether you use the value. Calling `useMemo` unconditionally keeps the hook list stable. The redirect still happens; only the illegal conditional hook call is gone.

**Where:** `src/pages/JournalPage.tsx` (hooks before `if (!valid)` / `if (isFuture)` returns).

---

## 2. Critical — Audio feature not represented in migrations

### What was wrong

The app and the `delete-journal-entry` edge function already depended on:

- a column `journal_entries.audio_storage_path`
- a private Storage bucket `journal-audio`
- storage RLS so users only touch files under `{userId}/…`

Those pieces were **not** in the SQL migration history. A fresh `db push` (or a new environment built only from migrations) could not reproduce production audio support. Schema and code had drifted.

### Why it was critical

Without a versioned schema:

- New environments break on audio upload/select/delete.
- Reviews and rollbacks cannot see what production actually needs.
- Storage without matching policies is a safety and ops risk.

### How it was fixed

A migration was added that:

1. `ADD COLUMN` `audio_storage_path` if missing.
2. Creates/updates the `journal-audio` bucket (private, size/mime limits).
3. Adds select/insert/update/delete policies scoping objects to `auth.uid()` as the first path folder.

**Where:** `supabase/migrations/20260714152010_journal_audio_storage.sql`

### Why that works

Migrations are the source of truth for Supabase schema. Once this file is applied on a project, the database and policies match what the client expects. *(If you have not run it on the live project yet, apply it via SQL editor or `db push`.)*

---

## 3. High — Past-day create blocked by RLS (UI vs policy mismatch)

### What was wrong

Product UX: any day **on or before today** is editable (`editable = date <= today`).

Database insert policy (original): only `entry_date = user_today(...)`.

Updates had already been relaxed to “any owned row,” but **first write** on an empty past day is an **INSERT** (upsert). RLS rejected that insert. The calendar looked writable; save failed for new past entries.

### Why it was high severity

Users reasonably assume “I can open yesterday and write.” The UI agreed; the database did not. That is a silent product break, not a missing button.

### How it was fixed

Insert policy was replaced with:

- `auth.uid() = user_id`
- **and** `entry_date <= public.user_today(auth.uid())`

**Where:** `supabase/migrations/20260714152020_journal_insert_on_or_before_today.sql`

### Why that works

RLS now matches the editor’s rule: create today or in the past, never in the future. Upserts that need a new row for an old date succeed for the owning user. Future dates remain blocked at the UI and still would fail a future-dated insert under this check.

*(Again: must be applied on the remote Supabase project to take effect there.)*

---

## 4. High — Stored XSS on the editable journal path

### What was wrong

Journal bodies are HTML from `contentEditable`.

- **Read-only** view already ran DOMPurify before `dangerouslySetInnerHTML`.
- **Editable** path set `innerHTML` from the database **unsanitized**, and saves stored raw editor HTML.

If malicious markup ever reached storage (compromise, buggy client, shared device, pasted content), opening an entry in edit mode could execute script in the user’s session.

### Why it was high severity

This is a classic **stored XSS** pattern: bad data sits in the DB and runs whenever the victim opens the day. A journal app holds personal content under an authenticated session — high impact.

### How it was fixed

1. Shared helper `sanitizeJournalHtml` (DOMPurify with the HTML profile).
2. **RichEditor:** sanitize when loading into the editable surface and when pushing draft changes.
3. **JournalPage:** sanitize body when loading from the DB and again before persist.

**Where:** `src/lib/sanitizeHtml.ts`, `src/components/RichEditor.tsx`, `src/pages/JournalPage.tsx`

### Why that works

Sanitization on **load** stops existing bad HTML from reaching the DOM. Sanitization on **input/persist** reduces the chance of writing dangerous markup back. Defense in depth: even if one path misses a case, the other still cleans at the boundary.

---

## Quick map

| Severity | Issue | Fix idea in one line |
| --- | --- | --- |
| Critical | Hooks after early return | Always call hooks; redirect afterward |
| Critical | Audio missing from migrations | Version column + bucket + storage RLS |
| High | Past-day insert denied | Insert RLS: date ≤ today |
| High | XSS in editable HTML | Sanitize on load, draft, and save |

## Related docs

- Forgot-password / recovery landing (separate medium/UX fix): [forgot-password-flow.md](./forgot-password-flow.md)
- Living status of remaining work: Cursor canvas `codebase-review.canvas.tsx`
