# Deployment Guide

## Goal

Ship the extension with:

- the Chrome extension loaded from a built `dist/`
- Supabase backing auth and data
- brand-facing docs/pages under `williamwu.ca`

## 1. Supabase

1. Create a Supabase project.
2. Open the SQL editor.
3. Run [`supabase/migrations/20260415_initial_schema.sql`](../supabase/migrations/20260415_initial_schema.sql).
4. In Auth settings, enable email OTP sign-in.
5. Copy the project URL and anon key.

Recommended:

- keep RLS enabled exactly as defined in the migration
- do not expose service role keys to the extension

## 2. Extension Environment

Create `extension/.env.local`:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_MAGIC_LINK_REDIRECT_URL=https://todo.williamwu.ca/auth/extension
```

Note:

- `VITE_MAGIC_LINK_REDIRECT_URL` is documented for future hosted auth flows, but the current V1 app uses OTP verification codes instead of redirects.

## 3. Build

```bash
cd extension
npm install
npm run build
```

Load `extension/dist` in Chrome Developer Mode.

## 4. DNS Under `williamwu.ca`

Recommended DNS plan:

- `todo.williamwu.ca`
  Host a landing page, privacy policy, support page, and future hosted auth bridge.
- `api.todo.williamwu.ca`
  Reserve for a future custom API or reverse proxy if you later move away from direct Supabase access.

For V1, a practical deployment is:

- Vercel for `todo.williamwu.ca`
- Supabase for database + auth

## 5. Chrome Web Store Hardening

Before publishing:

1. Tighten `host_permissions` in `extension/public/manifest.json`.
2. Replace any temporary copy with store-ready descriptions.
3. Host privacy and support pages on your domain.
4. Add screenshots from the actual built extension.
5. Verify the auth flow against the real Supabase project.

## 6. If You Want Google Sign-In Later

Recommended path:

1. Add a hosted auth page under `todo.williamwu.ca`.
2. Complete OAuth there.
3. Hand the session back to the extension using a controlled bridge flow.
4. Reduce direct provider complexity inside the extension itself.

