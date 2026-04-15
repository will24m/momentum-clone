# Supabase and Vercel Setup

Short version for this repo.

Do Supabase first. Vercel comes after.

## Supabase

1. Create a Supabase project.

2. Copy these two values from the project:
   - Project URL
   - Browser-safe public key (`anon` / publishable key)

3. Create [extension/.env.local](</Users/williamwu/Library/CloudStorage/OneDrive-Personal/Documents/Personal Code/momentum-clone/extension/.env.local>) with:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-key
VITE_MAGIC_LINK_REDIRECT_URL=https://todo.williamwu.ca/auth/extension
```

4. Open Supabase SQL Editor and run:
   - [supabase/migrations/20260415_initial_schema.sql](</Users/williamwu/Library/CloudStorage/OneDrive-Personal/Documents/Personal Code/momentum-clone/supabase/migrations/20260415_initial_schema.sql>)

5. In Supabase Auth:
   - enable Email auth
   - use an OTP-style email template
   - make sure the email clearly shows `{{ .Token }}`

6. If email delivery fails for non-team emails, set up custom SMTP.

7. In Supabase Auth URL settings:
   - set `SITE_URL` to `https://todo.williamwu.ca`

8. Build the extension:

```bash
cd extension
npm install
npm run build
```

9. Load [extension/dist](</Users/williamwu/Library/CloudStorage/OneDrive-Personal/Documents/Personal Code/momentum-clone/extension/dist>) in `chrome://extensions`.

10. Test:
   - local-only mode
   - email OTP sign-in
   - task creation
   - sync across 2 Chrome profiles/devices

## Vercel

1. Create a Vercel project for your website, not for the Chrome extension itself.

2. Add the custom domain:
   - `todo.williamwu.ca`

3. In your DNS provider, create exactly the DNS record Vercel tells you to create.

4. Publish these pages on Vercel:
   - `/`
   - `/privacy`
   - `/support`

5. If you later add hosted Google auth, use this same domain in Supabase redirect settings.

## Important

- Never put a secret Supabase key in the extension.
- Do not use `service_role` in client code.
- Keep RLS enabled.
- Vercel is optional for current OTP auth.
- Supabase is the real blocker for sync.

## If Something Breaks

- No email arrives:
  check Email auth, email template, and SMTP.

- Sign-in works but no data syncs:
  check `.env.local`, RLS, and whether rows appear in `tasks`.

- Vercel domain does not work:
  check DNS and wait for propagation.

## Official Docs

- Supabase API keys: https://supabase.com/docs/guides/api/api-keys
- Supabase email OTP: https://supabase.com/docs/guides/auth/auth-email-passwordless
- Supabase email templates: https://supabase.com/docs/guides/auth/auth-email-templates
- Supabase SMTP: https://supabase.com/docs/guides/auth/auth-smtp
- Supabase redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Vercel domains: https://vercel.com/docs/domains/set-up-custom-domain
- Vercel environment variables: https://vercel.com/docs/environment-variables
