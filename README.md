# Momentum Todo Workspace

Momentum Todo Workspace is a Manifest V3 Chrome extension that replaces the default new tab page with a calm, local-first todo workspace. It ships with inline editing, drag-and-drop reordering, offline-friendly persistence, undo toasts, theme support, a settings panel, and a Supabase-ready sync/auth path for multi-device use.

## What’s In This Repo

- A polished React + TypeScript + Tailwind Chrome extension in [`extension/`](./extension)
- Shared data models in [`shared/types.ts`](./shared/types.ts)
- Supabase schema and RLS policies in [`supabase/migrations/20260415_initial_schema.sql`](./supabase/migrations/20260415_initial_schema.sql)
- Deployment, architecture, privacy, and support docs in [`docs/`](./docs)
- Updated product planning notes in [`new_tab_todo_extension_planning_doc.md`](./new_tab_todo_extension_planning_doc.md)

## Current Product Shape

Implemented now:

- New tab override with Manifest V3
- Local-first todo experience backed by `chrome.storage.local`
- Inline add, edit, complete, delete, and undo
- Drag-and-drop reordering for active tasks
- Completed section with collapse behavior
- Sync status language and offline-friendly mutation queue
- Light, dark, and system theme support
- Accent themes and in-page settings
- First-run welcome flow
- Email OTP auth flow designed for extension compatibility
- Supabase-ready cloud sync path with optimistic updates
- Generated extension icons

Intentionally deferred:

- Google sign-in
- Due dates and priority metadata
- Background/service-worker sync
- Hosted marketing, privacy, and support pages as actual deployed sites

## Repo Structure

```text
root/
  extension/                 Chrome extension app
  shared/                    Shared TypeScript models
  supabase/migrations/       SQL schema and RLS policies
  docs/                      Architecture, deployment, privacy, support
  new_tab_todo_extension_planning_doc.md
  README.md
```

## Local Setup

1. Install Node.js 20+.
2. Copy `extension/.env.example` to `extension/.env.local`.
3. If you want sync, fill in your Supabase values.
4. Install dependencies:

```bash
cd extension
npm install
```

5. Build the extension:

```bash
npm run build
```

6. Open `chrome://extensions`, enable Developer Mode, choose `Load unpacked`, and select `extension/dist`.

## Supabase Setup

The extension is built so it still works without Supabase. To enable account sync:

1. Create a Supabase project.
2. Run the SQL in [`supabase/migrations/20260415_initial_schema.sql`](./supabase/migrations/20260415_initial_schema.sql).
3. Enable email OTP authentication in Supabase Auth.
4. Put your project URL and anon key in `extension/.env.local`.
5. Rebuild and reload the extension.

Important note:

- The current auth UX expects email OTP verification codes, not browser redirect callbacks.
- The manifest currently allows `*.supabase.co`, `*.supabase.in`, and `*.williamwu.ca` host access for setup flexibility. Tighten this before Chrome Web Store submission if you know the exact production origin.

## Key Technical Decisions

- The extension is the primary product. There is no separate custom backend app in this repo.
- Sync goes directly to Supabase for V1 speed and lower operational pain.
- Conflict handling uses last-write-wins on task fields and latest reorder snapshot wins.
- The local mutation queue is persisted so offline edits survive restarts.
- Sign-out keeps the visible list locally, but disables cloud sync until the user signs in again.

## Docs

- Architecture: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- Deployment: [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)
- Supabase + Vercel deep dive: [`docs/SUPABASE_VERCEL_DEEP_DIVE.md`](./docs/SUPABASE_VERCEL_DEEP_DIVE.md)
- Privacy policy draft: [`docs/PRIVACY_POLICY.md`](./docs/PRIVACY_POLICY.md)
- Support page draft: [`docs/SUPPORT.md`](./docs/SUPPORT.md)
- Release checklist: [`docs/RELEASE_CHECKLIST.md`](./docs/RELEASE_CHECKLIST.md)

## Notes For Future Work

- Add a hosted auth bridge on `todo.williamwu.ca` if you want Google sign-in.
- Consider moving sync flushing into a service worker if you want background retries without opening a new tab.
- Tighten host permissions once the production domain story is fixed.
- Add end-to-end tests after the Node toolchain is installed in the environment.
