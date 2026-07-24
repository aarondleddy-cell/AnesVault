# Credential Tracker — backend setup

1. **Supabase**: open your project (dfcajbdhgcgzhtnazsfw) → SQL Editor → run `supabase/schema.sql`.
2. **Storage**: confirm the `credential-docs` bucket was created (schema.sql creates it) — set to private.
3. **Env vars**: copy `.env.example` to `.env`, fill in `VITE_SUPABASE_ANON_KEY` (Project Settings → API → anon public key). Add the same vars in Vercel → Settings → Environment Variables.
4. **Install**: `npm install` (adds `@supabase/supabase-js`).
5. **Email digest**: deploy the edge function —
   ```
   supabase functions deploy credential-digest --project-ref dfcajbdhgcgzhtnazsfw
   supabase secrets set RESEND_API_KEY=... --project-ref dfcajbdhgcgzhtnazsfw
   ```
   Then schedule it via the SQL in `supabase/functions/credential-digest/CRON.md` (default: weekly, Mondays). Edit that cron string for daily instead.
6. **Auth email confirmations**: Supabase sends its own confirmation email on sign-up by default (Auth → Email Templates) — customize sender/copy there if desired.

Everything else (holders, credentials, RLS, document upload) is already wired into `AnesVault.jsx`.
