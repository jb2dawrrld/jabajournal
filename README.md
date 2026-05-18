# Jabajournal
**Let your words take the lead!!"*

Jabajournal started as my personal reflection platform and has grown into a deployed, multi-user web app where users can easily and securely create, manage, and revisit journal entries.
The experience is intentionally simple and minimalistic. No clutter, no endless customization; just you, the page, and your thoughts, free to roam.

On days when users need to be inspired, the app provides a daily randomly generated prompt to help users over their creative block and get started.
Alongside written entries, users can optionally attach audio recordings, blending traditional journaling with voice-based reflection.

Find the app here: [jabajournal.com](https://jabajournal.com)


## Local setup (optional)

```bash
npm install
npm run dev
```
Create a .env file with:
   - `VITE_SUPABASE_URL` =your_url
   - `VITE_SUPABASE_ANON_KEY`=your_key

## Deployment
Jabajournal is built with React and Vite, backed by Supabase for authentication, database, and storage, with an optional Tauri desktop shell for Windows and macOS. 
