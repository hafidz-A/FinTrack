# Moneyflow Dashboard Deploy

This folder is a Vite React deploy build of the FinTrack dashboard. It keeps the current UI, adds public multi-user Supabase Auth, stores finance data in an encrypted per-user vault, and leaves the original `moneyflow-dashboard` folder untouched.

## Recommended Hosting

For this app, Cloudflare Pages or Vercel are both fine. This folder now builds with Vite, so React/JSX is compiled during deployment instead of in the user's browser.

My practical recommendation:

1. **Cloudflare Pages** if you want very fast global static hosting and simple CDN behavior.
2. **Vercel** if you already use GitHub + Vercel and want the easiest path.
3. **Supabase** remains the backend either way.

## Supabase Setup

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Run `supabase/schema.sql`.
4. Enable Email/Password auth.
5. Keep Supabase's default email service for testing, or add custom SMTP later if public usage grows.
6. Add your deployed `app.html` URL to Auth redirect URLs.
7. Add these Vercel Environment Variables:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
```

For local development, copy `.env.example` to `.env.local` and fill the same values. Do not use or expose the Supabase `service_role` key. Supabase anon/publishable keys are meant for browser use, but row-level security must stay enabled.

## Local Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

Vercel should use:

```text
Build Command: npm run build
Output Directory: dist
```

## Privacy Model

There are two passwords:

1. **Account password**: Supabase Auth login. This can be reset by Supabase email token/link.
2. **Vault password**: encrypts transactions, accounts, budgets, goals, categories, and upcoming items in the browser. This is never sent to Supabase.

Each user also gets a recovery code when creating the vault. If they forget the vault password, they can unlock with that recovery code and set a new vault password. If both the vault password and recovery code are lost, the encrypted finance data cannot be recovered by the app owner.

## Password Reset

Supabase handles recovery token emails. Add your deployed URL to Supabase Auth redirect URLs, for example:

`https://your-site.vercel.app/app.html`

Then use the login screen's reset flow.

No Resend integration is required for the current build. Supabase's built-in email sender is enough for testing, but it has strict limits on the free/default email service; for real public traffic, configure SMTP later.
