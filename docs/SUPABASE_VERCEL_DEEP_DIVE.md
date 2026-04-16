# Supabase, Squarespace, and Vercel Setup

Short version for this repo.

Do Supabase first. Squarespace or Vercel can handle the public domain after that.

## Supabase

1. Create a Supabase project.

2. Get these two values from Supabase:
   - Project URL
   - Browser-safe public key (`anon` / publishable key)

   Where to find them:
   - easiest: open your Supabase project and use the `Connect` dialog
   - exact key location: `Project Settings -> API Keys`
   - if you are using the older key format, copy the client-side `anon` key from `Legacy API Keys`
   - if you are using the newer key format, copy the `Publishable key`

   Use in this repo:
   - `Project URL` -> `VITE_SUPABASE_URL`
   - `anon` or `Publishable key` -> `VITE_SUPABASE_ANON_KEY`

   Do not use:
   - `service_role`
   - `secret key`

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

## Squarespace

If you host or control `williamwu.ca` in Squarespace, Squarespace is where you make the domain live.

The pieces connect like this:

- Squarespace: domain, DNS, and any public website pages
- Supabase: database, auth, and optional branded API/auth domain
- Chrome extension: talks directly to Supabase using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

Supabase does not get "installed" into Squarespace. You connect them by using Squarespace DNS plus Supabase Auth settings.

### Smallest path that works

1. Keep your main site on Squarespace.

2. Decide which public URL should represent the product:
   - `https://www.williamwu.ca`
   - or `https://todo.williamwu.ca`

3. In Supabase Auth URL settings, set `SITE_URL` to that public URL.
   - Example: `https://todo.williamwu.ca`

4. Keep `extension/.env.local` pointed at your Supabase project URL unless you later enable a Supabase custom domain.

5. Build and load the extension.

### DNS records to add in Squarespace

If you want a product subdomain such as `todo.williamwu.ca`, create that subdomain in Squarespace DNS.

- If `todo.williamwu.ca` points to Vercel, add the exact DNS record Vercel gives you for `todo`.
- If `todo.williamwu.ca` stays on Squarespace, connect that subdomain to the correct Squarespace site in the Squarespace Domains UI.
- If you want a branded Supabase domain such as `api.todo.williamwu.ca`, add the records Supabase asks for in Squarespace:
  - a CNAME for `api.todo` pointing to your project's `*.supabase.co` hostname
  - a TXT record for `_acme-challenge.api.todo` with the verification value from Supabase

After a Supabase custom domain is verified and activated, you can optionally change:

```dotenv
VITE_SUPABASE_URL=https://api.todo.williamwu.ca
```

### Important notes

- You do not need a Supabase custom domain for this repo to work.
- Keeping the default `https://your-project-ref.supabase.co` URL is completely fine for V1.
- Supabase custom domains are a paid add-on on a paid plan.
- Supabase custom domains only support subdomains, not the root apex domain.

### Quick live checklist

1. `williamwu.ca` DNS is managed in Squarespace.
2. Your public site is live at either `https://www.williamwu.ca` or `https://todo.williamwu.ca`.
3. Supabase `SITE_URL` matches that public URL.
4. `extension/.env.local` has the real `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. The SQL migration has been run.
6. The extension has been rebuilt and reloaded in Chrome.

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
- Supabase custom domains: https://supabase.com/docs/guides/platform/custom-domains
- Vercel domains: https://vercel.com/docs/domains/set-up-custom-domain
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Squarespace DNS records: https://support.squarespace.com/hc/en-us/articles/31119879125645-DNS-records-for-web-hosting
- Squarespace subdomain pointing: https://support.squarespace.com/hc/en-us/articles/215744668-Pointing-a-Squarespace-domain
