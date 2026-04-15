# Supabase and Vercel Deep Dive

This guide is the detailed operational walkthrough for taking this repo from "implemented locally" to "connected to real infrastructure".

Last reviewed against official Supabase and Vercel docs on April 15, 2026.

Minor dashboard labels may shift over time, but the sequence and platform concepts in this guide are aligned to the official docs listed at the end.

It is written specifically for this project:

- Chrome extension source: [extension](</Users/williamwu/Library/CloudStorage/OneDrive-Personal/Documents/Personal Code/momentum-clone/extension>)
- Supabase schema: [supabase/migrations/20260415_initial_schema.sql](</Users/williamwu/Library/CloudStorage/OneDrive-Personal/Documents/Personal Code/momentum-clone/supabase/migrations/20260415_initial_schema.sql>)
- Environment example: [extension/.env.example](</Users/williamwu/Library/CloudStorage/OneDrive-Personal/Documents/Personal Code/momentum-clone/extension/.env.example>)

This is intentionally much more detailed than the shorter deployment guide.

## Read This First

For this repo, Supabase matters first. Vercel is secondary for the current V1.

Why:

- the extension already works locally without Vercel
- sync and auth depend on Supabase
- the current auth UX uses email OTP inside the extension, not a hosted redirect callback

So the correct order is:

1. Set up Supabase.
2. Connect the extension to Supabase.
3. Test the extension in Chrome.
4. Set up Vercel for branded pages and future hosted auth expansion.

## What This Repo Uses Supabase For

Supabase is the live backend for:

- user authentication
- tasks table storage
- user settings storage
- row-level security enforcement
- optional multi-device sync

This repo does not currently use:

- Supabase Edge Functions
- Supabase Storage
- Supabase Realtime subscriptions

The extension talks directly to Supabase using the browser-safe public client key. That means:

- RLS must stay enabled
- you must never put a secret or `service_role` key in the extension

## What This Repo Uses Vercel For

Vercel is best used here for:

- `todo.williamwu.ca`
- landing page
- privacy page
- support page
- future hosted Google auth bridge if you add OAuth later

Vercel is not required for the current OTP-in-extension auth flow.

## Part 1: Supabase Deep Dive

## 1. Create the Supabase Project

Go to the Supabase dashboard and create a new project.

Recommended choices:

- Organization: your personal organization or team
- Project name: `momentum-todo` or similar
- Database password: generate and save it somewhere secure
- Region: choose the one closest to your expected users, usually the same region you would choose for Vercel

What to save immediately:

- project reference / project ID
- database password
- organization/project ownership location

Do not close the setup flow without saving the password.

## 2. Confirm the Project Is Healthy Before Doing Anything Else

After project creation finishes:

1. Open the project dashboard.
2. Wait for the database and API to finish provisioning.
3. Confirm the dashboard is no longer showing provisioning or setup banners.

If the dashboard looks half-ready, wait. Running migrations too early is a good way to confuse yourself.

## 3. Get the Correct URL and Key

This repo needs:

- project URL
- browser-safe public key

Where to find them:

- usually the project "Connect" dialog
- or Project Settings -> API / API Keys

For this repo, place the browser-safe public key into:

- `VITE_SUPABASE_ANON_KEY`

Important:

- Supabase now documents both legacy `anon` keys and newer publishable keys
- this repo’s env var name still says `ANON_KEY`
- that variable must contain a browser-safe public key only

Never use:

- `service_role`
- `sb_secret_*`
- any other secret server-side key

Why:

- the extension code is shipped to the browser
- anything in the extension can be extracted by users

Official Supabase guidance says public components must use publishable/`anon` style keys, and secret keys are only for backend-controlled environments.

## 4. Create the Local Env File

Create:

- [extension/.env.local](</Users/williamwu/Library/CloudStorage/OneDrive-Personal/Documents/Personal Code/momentum-clone/extension/.env.local>)

Using:

- [extension/.env.example](</Users/williamwu/Library/CloudStorage/OneDrive-Personal/Documents/Personal Code/momentum-clone/extension/.env.example>)

Use this shape:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-browser-safe-public-key
VITE_MAGIC_LINK_REDIRECT_URL=https://todo.williamwu.ca/auth/extension
```

Notes:

- `VITE_MAGIC_LINK_REDIRECT_URL` is not required by the current OTP flow, but keep it filled for future hosted auth work.
- Do not commit `.env.local`.

## 5. Run the SQL Migration

Open Supabase:

- Database section
- SQL Editor

Then:

1. Open [supabase/migrations/20260415_initial_schema.sql](</Users/williamwu/Library/CloudStorage/OneDrive-Personal/Documents/Personal Code/momentum-clone/supabase/migrations/20260415_initial_schema.sql>)
2. Copy the entire file
3. Paste it into a new SQL Editor query
4. Run it

What this migration creates:

- `tasks` table
- `user_settings` table
- update timestamp trigger function
- update triggers
- indexes
- row-level security policies

What success should look like:

- query runs with no permission errors
- tables appear in Table Editor
- RLS is enabled on both tables

After running it, manually inspect:

1. Table Editor -> `tasks`
2. Table Editor -> `user_settings`
3. Authentication / Database policies area if available in your dashboard view

Things to confirm:

- `tasks.user_id` references `auth.users`
- `tasks.deleted_at` exists
- `user_settings.user_id` is primary key
- both tables have RLS enabled

## 6. Understand the RLS Model Before Testing

This project relies on client-side Supabase access plus RLS.

That means:

- unauthenticated users should not be able to read another user’s tasks
- authenticated users should only be able to read/write rows where `auth.uid() = user_id`

If you disable RLS to "make it work", you are breaking the project’s security model.

Do not do that.

If something fails, debug the policy or auth state instead.

## 7. Configure Auth for Email OTP

Open Supabase:

- Authentication
- Providers
- Email

What you want:

- Email auth enabled
- OTP/passwordless behavior available

This repo is built around email OTP verification codes entered directly in the extension UI.

That means the important UX is:

1. user enters email in extension
2. extension calls `signInWithOtp`
3. email delivers a 6-digit token
4. user pastes token into extension
5. extension calls `verifyOtp`

This is not the same as a magic-link-first redirect flow.

## 8. Update the Email Template for OTP

This is one of the easiest places to make the project feel broken if configured incorrectly.

Open:

- Authentication
- Email Templates

Look at the magic link / email login template that Supabase uses for passwordless email.

For this repo, you want the template to surface the OTP token to the user.

Supabase documents these template variables:

- `{{ .ConfirmationURL }}`
- `{{ .Token }}`

For this project, the crucial one is:

- `{{ .Token }}`

Why:

- the extension UI asks the user to paste a verification code
- if the email only contains a link and not the token, the current UX becomes confusing

Practical recommendation:

- make the template clearly display the 6-digit code
- keep the email plain and obvious
- do not bury the code in decorative copy

Simple template direction:

- subject: "Your Momentum Todo sign-in code"
- body: explain this is the sign-in code for the extension
- prominently show `{{ .Token }}`

You can keep `{{ .ConfirmationURL }}` out of the primary experience if you want the flow to stay code-based.

## 9. Understand Supabase Default Email Limits Before Inviting Real Users

Supabase’s default email system is fine for:

- testing
- project team members
- demos
- non-production experiments

It is not the right final setup for public production auth traffic.

Supabase’s docs explicitly warn that for broader use you should configure custom SMTP.

Also, by default, messages may only go to project team member addresses, and non-authorized addresses can fail.

So:

- if your test email is not a project team/member email and delivery fails
- or if you want real users later

set up custom SMTP.

## 10. Configure Custom SMTP

Open:

- Authentication settings
- SMTP / Email sending section

Pick a provider such as:

- Resend
- Postmark
- AWS SES
- SendGrid
- Brevo

You will need:

- SMTP host
- SMTP port
- SMTP username
- SMTP password / API credential
- default From address, like `no-reply@todo.williamwu.ca`

Practical recommendation for this project:

- use a transactional provider with good deliverability
- use a branded From domain later, such as `no-reply@todo.williamwu.ca`

After you enter SMTP settings:

1. save configuration
2. send a test OTP email
3. verify the email lands in inbox, not spam
4. verify the code is easy to find

If deliverability is poor, fix DNS for the email provider:

- SPF
- DKIM
- sometimes DMARC

This is separate from Vercel DNS for the website itself.

## 11. URL Configuration in Supabase

Even though the current flow is OTP-first inside the extension, you should still configure auth URLs correctly.

Open:

- Authentication
- URL Configuration

At minimum set:

- `SITE_URL` to your official site, likely `https://todo.williamwu.ca`

If you later add hosted auth or preview environments, add redirect URLs as needed.

Supabase documents that for Vercel preview deployments you can use allow-list entries like:

- `https://*-<team-or-account-slug>.vercel.app/**`

For this repo today, recommended baseline values are:

- `SITE_URL = https://todo.williamwu.ca`
- local dev redirect allow-list entries only if you later build a hosted auth page

Because the extension currently verifies OTP by email and code, redirect configuration is not the main blocker. Still, configure it now so future hosted auth work is easier.

## 12. Build and Load the Extension With Real Supabase Credentials

From the repo root:

```bash
cd extension
npm install
npm run build
```

Then in Chrome:

1. go to `chrome://extensions`
2. enable Developer Mode
3. click `Load unpacked`
4. select [extension/dist](</Users/williamwu/Library/CloudStorage/OneDrive-Personal/Documents/Personal Code/momentum-clone/extension/dist>)

Open a new tab.

What should happen:

- the custom page appears
- local mode still works
- "Turn on sync" should now be meaningful because env vars are real

## 13. Test the Supabase Connection in the Real UX

Test in this order:

### Test A: Local-only baseline

1. open the extension
2. continue locally
3. add a few tasks
4. edit them
5. reorder them
6. restart Chrome
7. confirm they are still there

This confirms the extension works before auth even enters the picture.

### Test B: OTP send

1. click turn on sync
2. enter your email
3. submit
4. confirm the email arrives
5. confirm the email contains a visible token

If this fails:

- check SMTP
- check email provider restrictions
- check whether your email is authorized under the default mailer

### Test C: OTP verify

1. paste the code into the extension
2. submit verification
3. confirm the extension becomes signed in
4. confirm sync mode becomes active

### Test D: Remote task creation

1. while signed in, add tasks
2. open Supabase Table Editor -> `tasks`
3. confirm rows appear for your user

Check:

- `user_id` is populated
- `text` is correct
- `completed` is correct
- `order_index` is populated

### Test E: Settings sync

1. change theme or completed-section preference
2. open `user_settings` table
3. confirm row appears or updates

### Test F: Multi-device / multi-profile sync

Best practice:

- use a second Chrome profile, not just a second tab

Steps:

1. load the unpacked extension in profile A
2. sign in
3. create tasks
4. load the same extension in profile B
5. sign in with the same email
6. confirm tasks appear

This is the real sync test that matters.

### Test G: Offline queue behavior

1. sign in
2. disconnect network
3. create or edit tasks
4. reconnect
5. reopen a new tab if needed
6. confirm changes eventually land in Supabase

This validates the queue and recovery behavior.

## 14. Common Supabase Mistakes for This Repo

### Mistake 1: Using the wrong key

Bad:

- `service_role`
- `sb_secret_*`

Correct:

- public browser-safe key only

### Mistake 2: Leaving the email template link-based only

The extension expects code entry. If the email hides the OTP and only emphasizes a link, users will get confused.

### Mistake 3: Disabling RLS

If you do this, you lose the entire safety model of direct client access.

### Mistake 4: Forgetting custom SMTP

The default mailer is not your real production email setup.

### Mistake 5: Testing only in one browser profile

That does not prove cross-device or cross-profile sync.

### Mistake 6: Assuming Vercel is required before Supabase

For this repo, it is not.

## 15. Recommended Supabase "Done" Checklist

- [ ] project created
- [ ] URL and public key copied
- [ ] `.env.local` created
- [ ] SQL migration run successfully
- [ ] tables exist and RLS is enabled
- [ ] email auth configured
- [ ] email template shows OTP token clearly
- [ ] custom SMTP configured
- [ ] extension built
- [ ] extension loaded in Chrome
- [ ] sign-in works
- [ ] task rows appear in `tasks`
- [ ] settings rows appear in `user_settings`
- [ ] sync verified across at least two profiles/devices

## Part 2: Vercel Deep Dive

## 16. What Vercel Should Host for This Project

The clean V1 setup is:

- `todo.williamwu.ca` -> Vercel project
- pages on that site:
  - `/`
  - `/privacy`
  - `/support`

Future optional use:

- hosted Google auth bridge
- marketing page
- screenshots
- help docs

## 17. Decide What You Are Deploying to Vercel

Right now there are two reasonable paths:

### Option A: Separate small site repo or folder

Best if you want:

- a simple marketing/docs site
- very small operational scope

### Option B: Add a site inside this repo later

Best if you want:

- one repo for extension + website
- shared branding and docs

Right now this repo does not yet include a Vercel-ready site app. So Vercel setup is primarily about preparing the branded web presence, not deploying the extension itself.

## 18. Create the Vercel Project

Go to Vercel and create/import a project.

You can do this:

- from the dashboard by importing a Git repository
- or with CLI using `vercel` from a project directory

If using the dashboard:

1. click `Add New...`
2. choose `Project`
3. connect your Git provider if needed
4. import the repository that contains your site

Important:

- if you use a monorepo later, be careful to set the root directory correctly
- do not point Vercel at the Chrome extension build unless you actually want to host a static page from it

## 19. If You Build a Site for This Repo Later, Use These Expectations

If you create a Vite-based site:

- Vercel supports Vite directly
- it can auto-detect framework settings
- `npm run build` is the standard build command
- the output directory is typically `dist`

For a site project, verify these settings in Vercel before clicking deploy:

- Framework Preset: Vite
- Root Directory: the folder containing that site
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: usually `npm install`

If Vercel auto-detects correctly, leave the defaults alone.

## 20. Add the Custom Domain

After the Vercel project exists:

1. open the Vercel project
2. go to Settings
3. open Domains
4. add `todo.williamwu.ca`

If you also want `www`, add that separately.

If you want the root apex domain one day, that is a separate decision from the `todo` subdomain.

## 21. Configure DNS for `williamwu.ca`

Once you add the domain, Vercel will tell you the DNS records it expects.

Common patterns include:

- subdomain via `CNAME`
- apex via `A` record to `76.76.21.21`

Do not guess the final DNS values if Vercel shows you exact records. Use Vercel’s exact instructions for your case.

Typical flow:

1. add `todo.williamwu.ca` in Vercel
2. Vercel shows required DNS record
3. open your DNS provider for `williamwu.ca`
4. create the record exactly as shown
5. return to Vercel and wait for verification

If DNS is managed somewhere else:

- Cloudflare
- registrar DNS
- another provider

make the change there, not in Vercel unless you delegate nameservers to Vercel.

## 22. Understand Preview Deployments and Why They Matter

Vercel preview deployments are useful if you later build:

- a hosted auth bridge
- a landing page with iterative edits
- a support/privacy site that you want to preview before production

Each non-production branch can get its own preview URL.

This matters for Supabase because if you later use hosted auth on Vercel, Supabase redirect allow-list entries may need to include Vercel preview URLs.

Supabase documents this pattern for Vercel previews:

- `https://*-<team-or-account-slug>.vercel.app/**`

That is mainly for future hosted auth work, not for the current OTP-in-extension flow.

## 23. Environment Variables on Vercel

If you later host a site or auth bridge on Vercel, configure environment variables in:

- Project Settings
- Environment Variables

Vercel separates them by environment:

- Production
- Preview
- Development

Why this matters:

- Production values power the real site
- Preview values power branch deploys
- Development values can be pulled locally with `vercel env pull`

If you host a Vercel site for this project later, likely env vars would include some combination of:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # only if you add secure server-side code
```

Important:

- if you are only hosting static privacy/support pages, you may not need any env vars at all
- never expose server-only keys as browser-visible env vars

## 24. What To Deploy on Vercel First

The highest-value first Vercel deployment is not an auth system.

It is:

- a clean landing page
- privacy policy page
- support page

Why:

- Chrome Web Store submission wants privacy/support materials
- these are low risk
- they establish the branded domain early

So the practical V1 order is:

1. create Vercel project
2. add `todo.williamwu.ca`
3. publish `/privacy`
4. publish `/support`
5. later decide whether to add a hosted auth page

## 25. If You Later Add Google Sign-In

This is where Vercel becomes more central.

The likely shape would be:

1. user clicks "Sign in with Google" in extension
2. extension opens a hosted page on `todo.williamwu.ca`
3. hosted page performs OAuth safely
4. hosted page hands session or token info back to extension through a controlled flow

If you go this route later:

- configure Supabase Google provider
- configure Supabase URL allow-list carefully
- configure Vercel production and preview URLs
- keep server-only secrets only in Vercel server-side env vars

That is a future improvement, not a current blocker.

## 26. Common Vercel Mistakes for This Repo

### Mistake 1: Trying to deploy the Chrome extension itself to Vercel

The extension is loaded into Chrome from `extension/dist`. Vercel is for the supporting website, not for extension installation.

### Mistake 2: Setting up Vercel before Supabase

That delays the part that actually unlocks sync and auth.

### Mistake 3: Forgetting domain verification/DNS propagation time

Even correct records can take time to verify.

### Mistake 4: Mixing public and secret env vars

On Vercel, only expose public keys to browser-side code.

### Mistake 5: Ignoring preview URL implications

If you later use hosted auth, preview URLs may need allow-list treatment in Supabase.

## 27. Recommended Vercel "Done" Checklist

- [ ] Vercel account/team chosen
- [ ] project created
- [ ] correct repo/root directory selected
- [ ] `todo.williamwu.ca` added
- [ ] DNS records created exactly as Vercel instructed
- [ ] domain verified
- [ ] privacy page published
- [ ] support page published
- [ ] preview deployments understood if using a Git-connected site

## 28. Recommended Real-World Rollout Sequence

If you want the least painful path, do this in order:

1. Create Supabase project.
2. Add env vars locally.
3. Run SQL migration.
4. Configure email auth.
5. Configure OTP-focused email template.
6. Configure custom SMTP.
7. Build the extension.
8. Load the extension in Chrome.
9. Verify sign-in and sync across two profiles.
10. Create Vercel project for branded site.
11. Connect `todo.williamwu.ca`.
12. Publish privacy and support pages.
13. Tighten manifest host permissions before store submission.

## 29. Suggested Personal "Session Plan"

If you are doing this in one sitting, a good split is:

### Session 1: Supabase foundation

- create project
- copy keys
- run migration
- configure auth
- set email template

### Session 2: Email delivery and extension test

- set up custom SMTP
- build extension
- load unpacked extension
- verify OTP and sync

### Session 3: Branded web presence

- create Vercel project
- add domain
- set DNS
- publish privacy/support pages

### Session 4: Hardening

- multi-profile sync test
- offline test
- merge-flow test
- permission tightening

## 30. Official References

These were the primary official references used when writing this guide.

- Supabase API keys: https://supabase.com/docs/guides/api/api-keys
- Supabase database overview / SQL Editor: https://supabase.com/docs/guides/database/overview
- Supabase passwordless email / OTP: https://supabase.com/docs/guides/auth/auth-email-passwordless
- Supabase email templates: https://supabase.com/docs/guides/auth/auth-email-templates
- Supabase custom SMTP: https://supabase.com/docs/guides/auth/auth-smtp
- Supabase redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Vercel getting started: https://vercel.com/docs/getting-started-with-vercel
- Vercel Vite: https://vercel.com/docs/frameworks/frontend/vite
- Vercel custom domains: https://vercel.com/docs/domains/set-up-custom-domain
- Vercel environment variables: https://vercel.com/docs/environment-variables

Dashboard paths and operational sequencing in this file are repo-specific recommendations layered on top of those official docs.
