# New Tab Todo Extension: Product and Engineering Planning Document

## 1. Goal

Build a Chrome extension that replaces the default new tab page with a polished, fast, persistent, editable todo workspace. The product should feel clean, calm, modern, and useful enough that opening a new tab becomes helpful instead of distracting.

The extension must support cross-device sync for the same user account across any device where the extension is installed and the user signs in. Data should be backed by a hosted service under `williamwu.ca`.

This document is written for a coding agent. It should be treated as the source of truth for product scope, UX expectations, architecture, API behavior, edge cases, non-functional requirements, and implementation sequence.

---

## 2. Product Vision

Every new tab becomes a personal command center built around a todo list.

The experience should be:

- instant to load
- pleasant to look at
- frictionless to edit
- reliable across devices
- safe against accidental data loss
- good enough visually that it does not look like a student side project

The first version should prioritize one thing: a really strong todo experience. Do not bloat the first version with too many widgets.

---

## 3. Core User Story

As a user, when I open a new tab, I want to immediately see my todo list, edit it inline, reorder it, and trust that it will stay synced across my laptop and any other device using the extension.

---

## 4. Product Principles

1. **Zero friction**
   - New tab must open directly into the todo experience.
   - No extra clicks to start using it.

2. **Fast first paint**
   - The page should render useful content almost instantly.
   - Cached local data should appear first, then sync in background.

3. **Inline editing everywhere**
   - Adding, editing, completing, deleting, and reordering tasks should feel direct.
   - Avoid clunky modal-heavy behavior.

4. **Looks premium**
   - Spacious layout, clear hierarchy, subtle motion, strong typography, good contrast.
   - Design should feel like a polished productivity app, not a default browser settings page.

5. **Local-first feel, cloud-backed reality**
   - The UI should feel instant by using local cache.
   - Backend should ensure persistence and multi-device sync.

6. **Resilient sync**
   - It must handle refreshes, intermittent internet, and multiple devices without creating obvious broken states.

---

## 5. Scope

### In scope for V1

- Replace Chrome new tab page
- User authentication
- Hosted backend on a subdomain of `williamwu.ca`
- Persistent todo list storage in database
- Cross-device sync for signed-in users
- Inline create, edit, complete, delete
- Drag-and-drop reorder
- Task grouping into at least:
  - Active
  - Completed
- Smooth loading states
- Empty states
- Error states
- Local caching for fast startup and offline-ish behavior
- Sync status indicator
- Responsive layout for different desktop/laptop screen sizes
- Clean settings panel
- Theme support, at minimum light and dark

### Nice to have if easy

- Due dates
- Today view / upcoming section
- Pinned priority tasks
- Keyboard shortcuts
- Subtle background personalization
- Undo after delete

### Out of scope for V1 unless it is nearly free

- Team collaboration
- Shared lists
- Mobile app
- Browser support beyond Chrome at first
- Calendar integrations
- AI features
- Rich note editor
- File attachments

---

## 6. User Experience Requirements

## 6.1 Opening a new tab

When a user opens a new tab:

1. The page should render shell UI immediately.
2. Locally cached tasks should display as fast as possible.
3. Remote sync should happen quietly in background.
4. If remote data differs, UI should update smoothly.
5. User should never stare at a blank page.

### UX rule

Prefer stale-but-visible data over blank loading.

---

## 6.2 First-time user flow

If user is not signed in:

- Show a polished welcome screen inside the new tab page.
- Explain value in one sentence.
- Offer:
  - Continue without account
  - Sign in to sync across devices

If continuing without account:

- Store tasks locally only
- Lightly encourage account creation later

If signing in:

- Use a simple auth flow
- On success, redirect back into the new tab UI
- If local tasks exist, prompt to either:
  - merge local tasks into account
  - keep cloud tasks only

### UX rule

Do not force account creation on day one. But make synced mode the obvious better option.

---

## 6.3 Main page layout

The page should have a strong visual structure.

### Suggested layout

- Top bar
  - logo / wordmark
  - greeting or minimal heading
  - sync status
  - settings/profile button

- Main content area
  - central card or split layout with the todo list as the hero element
  - input row for adding a task
  - active tasks section
  - completed tasks section, collapsed by default if many items

- Optional right rail or lower section
  - date
  - short motivational line
  - productivity stats for the day

### Layout direction

Keep the todo list dominant. Any secondary panel must not compete with it.

---

## 6.4 Add task interaction

Requirements:

- Task input should be visible by default
- Hitting Enter adds task
- Empty input should do nothing
- Add should feel immediate
- New task should appear instantly in UI before backend round trip completes
- On failure, keep task visible but mark unsynced and retry

Nice additions:

- quick add placeholder text
- support pasting multiple lines to create multiple tasks

---

## 6.5 Edit task interaction

Requirements:

- Click task text to edit inline
- Enter saves
- Escape cancels
- Blur saves if changed
- Emptying a task should trigger either delete or explicit confirmation depending on UX choice

### Recommendation

Treat empty edited text as delete, but support undo.

---

## 6.6 Complete task interaction

Requirements:

- Checkbox or equivalent control
- Completion animation should be subtle
- Completed tasks move to completed section
- Allow easy uncomplete

### Recommendation

Do not instantly hide completed tasks if it causes disorientation. Animate the move or keep them visible briefly.

---

## 6.7 Delete task interaction

Requirements:

- Fast delete
- Support undo toast for a few seconds
- Do not force a confirmation modal for every deletion

---

## 6.8 Reordering

Requirements:

- Drag-and-drop for active tasks
- Reorder should update locally first
- Backend order update should happen after
- Must work smoothly with many tasks

### Recommendation

Use a known drag-and-drop library with good keyboard accessibility support if possible.

---

## 6.9 Empty states

Empty state should not look dead.

Examples:

- “Nothing here yet. Add your first task.”
- maybe one subtle illustration or icon
- keep it minimal, not childish

---

## 6.10 Offline and poor connection behavior

Requirements:

- User can still view cached tasks
- User can still make changes locally
- Changes queue for sync when connection returns
- Show subtle offline or unsynced indicator

### UX rule

Do not spam the user with technical sync errors unless action is needed.

---

## 6.11 Settings

Settings panel should include at least:

- Sign in / sign out
- Theme
- Default behavior for completed tasks section
- Option to use local-only mode
- Option to clear all completed tasks

Nice to have:

- background image or gradient selection
- typography density choices

---

## 7. Visual Design Direction

## 7.1 Overall style

Target a clean productivity aesthetic.

Keywords for design direction:

- minimal
- premium
- calm
- modern
- airy
- sharp

Avoid:

- heavy skeuomorphism
- harsh colors everywhere
- cluttered dashboards
- tiny click targets
- overly playful student-hackathon style UI

---

## 7.2 Visual hierarchy

The most important thing on screen should always be the current actionable tasks.

Hierarchy should be:

1. Add task input
2. Active task list
3. Sync/account state
4. Completed tasks
5. Secondary info

---

## 7.3 Typography

Use a clean, modern sans-serif.

Design expectations:

- large page title or subtle branded heading
- readable task text size
- strong contrast
- enough spacing between rows
- line-height that does not feel cramped

---

## 7.4 Spacing and sizing

UI should breathe.

Requirements:

- generous padding
- task rows tall enough to feel clickable
- consistent spacing rhythm
- avoid dense table-like appearance

---

## 7.5 Motion

Animations should be subtle and useful.

Use motion for:

- task add
- task complete
- task reorder
- toast appearance
- settings panel open/close

Avoid flashy motion.

---

## 7.6 Theme support

Must support:

- light mode
- dark mode

Nice to have:

- follow system theme

---

## 8. Functional Requirements

## 8.1 Authentication

Users should be able to create an account and sign in.

Recommended options:

- email magic link
- Google sign-in

Preferred:

- Google sign-in for low friction
- optional email magic link as fallback

Requirements:

- extension can detect signed-in state
- auth session persists across new tabs
- sign-out clears sensitive cached account state but may keep local cached tasks if product chooses

---

## 8.2 Task model

Each task should have at least:

- `id`
- `userId` or null for local-only mode
- `text`
- `completed`
- `order`
- `createdAt`
- `updatedAt`
- `deletedAt` nullable
- `syncStatus` local client field only, not necessarily stored in DB

Possible extended fields:

- `dueDate`
- `priority`
- `notes`

---

## 8.3 Sync behavior

Requirements:

- local cache hydrates UI fast
- remote source of truth exists for signed-in users
- optimistic updates
- retry on failure
- conflict handling for edits from multiple devices

### Conflict strategy recommendation for V1

Use `updatedAt` plus last-write-wins for simple fields.
For reordering, accept latest full ordered list update from the most recent change.
This is not perfect, but good enough for V1 if implemented consistently.

The agent should document limitations of this strategy in code comments and internal docs.

---

## 8.4 Data retention and deletion

Requirements:

- deleting a task should not necessarily hard delete immediately
- soft delete is preferred in backend for recovery/debugging
- users should be able to clear completed tasks
- account deletion can be future scope, but architecture should not make it painful later

---

## 8.5 Local-only mode

Requirements:

- extension should work without account
- use local storage for anonymous mode
- if user later signs in, support migration/merge flow

---

## 9. Technical Architecture

## 9.1 High-level architecture

There are three layers:

1. **Chrome extension frontend**
   - New tab override page
   - Todo UI
   - Local caching
   - Auth session handling
   - Background sync behavior if needed

2. **Backend API**
   - Auth verification
   - CRUD for tasks
   - Reorder endpoint
   - User profile/settings endpoints

3. **Database**
   - Stores users and tasks
   - Supports sync across devices

---

## 9.2 Domain and hosting

Host the backend under a clean subdomain on `williamwu.ca`.

Suggested structure:

- `todo.williamwu.ca` for web landing page or hosted frontend if needed
- `api.todo.williamwu.ca` for API
- or simpler:
  - `api.williamwu.ca/todo/...`

Recommended:

- frontend marketing or landing page at `todo.williamwu.ca`
- API at `api.todo.williamwu.ca`

The extension itself is installed in Chrome, but its remote sync and auth backend should point to your hosted domain.

---

## 9.3 Recommended stack

### Extension frontend

- React
- TypeScript
- Vite or a Chrome-extension-friendly build setup
- Tailwind CSS for rapid polished UI
- state management: Zustand or simple React Query + local state

### Backend

Strong recommendation:

- Next.js or Express with TypeScript
- hosted on Vercel, Railway, Render, or a small VPS

Best practical choice for speed:

- Next.js for frontend/admin/landing plus API routes if small scale
- or Express/Fastify if you want a pure API backend

### Database

- PostgreSQL

### ORM

- Prisma

### Auth

- Supabase Auth
- Clerk
- Auth.js
- Firebase Auth

Most practical choice for speed and low pain:

- Supabase Auth + Postgres
- or Clerk + Postgres if agent prefers it

### Local client storage

- `chrome.storage.local` for cached tasks, preferences, and session-related non-sensitive data

### Sync/query layer

- TanStack Query strongly recommended

---

## 9.4 Recommended final architecture choice

The coding agent should default to this unless there is a very good reason not to:

### Option A: Fastest solid path

- Chrome extension frontend: React + TypeScript + Tailwind
- Backend/Auth/DB: Supabase
- Custom API layer only where needed
- Domain: custom domain pointing to Supabase-hosted auth callbacks or your own app domain

Why:

- much faster to build
- auth and database pain reduced
- real-time sync possible later
- still can live under your domain

### Option B: More custom control

- Chrome extension frontend: React + TypeScript + Tailwind
- Backend: Next.js or Express on `api.todo.williamwu.ca`
- DB: Postgres
- Auth: Auth.js or Clerk

Why:

- more control
- cleaner custom architecture
- more work

### Recommendation

Tell the coding agent to build Option A first unless there is a constraint against managed services.

---

## 10. Chrome Extension Requirements

## 10.1 Manifest

Use Manifest V3.

The extension must:

- override new tab page
- request only minimal permissions
- avoid scary permission prompts unless required

Likely permissions:

- `storage`
- maybe `identity` if using browser-based auth flow depending on auth method

Avoid broad permissions unless truly needed.

---

## 10.2 Extension pages

At minimum:

- `newtab.html` or equivalent bundled entry
- optional options/settings page
- optional background service worker

The coding agent should keep architecture clean so later popup/options pages can be added without rewrite.

---

## 10.3 Auth inside extension

This is an area where many implementations get messy.

Requirements:

- user can sign in from extension UI
- session persists across browser restarts if valid
- auth callbacks must work with Chrome extension context and hosted backend

Possible approaches:

1. Open hosted auth page on `todo.williamwu.ca`, complete login there, return token/session to extension
2. Use Chrome identity APIs if provider supports it well

### Recommendation

Prefer a hosted web auth flow on your domain because it is easier to control, easier to brand, and less fragile than trying to do everything inside extension pages.

---

## 11. Backend API Requirements

If building a custom API, endpoints should include at least:

### Auth/session

- `POST /auth/session/exchange` if needed for extension auth handoff
- `GET /me`

### Tasks

- `GET /tasks`
- `POST /tasks`
- `PATCH /tasks/:id`
- `DELETE /tasks/:id`
- `POST /tasks/reorder`

### Settings

- `GET /settings`
- `PATCH /settings`

### Sync

Optional but useful:

- `GET /sync?since=timestamp`

### API behavior expectations

- all endpoints authenticated except anonymous local-only mode
- clear JSON responses
- consistent error format
- rate limiting if public-facing

---

## 12. Database Design

## 12.1 Users table

Fields may include:

- `id`
- `email`
- `name`
- `imageUrl`
- `createdAt`
- `updatedAt`

## 12.2 Tasks table

Fields:

- `id`
- `userId`
- `text`
- `completed`
- `orderIndex`
- `createdAt`
- `updatedAt`
- `deletedAt`

## 12.3 User settings table

Fields:

- `id`
- `userId`
- `theme`
- `completedSectionCollapsed`
- `defaultMode`
- `createdAt`
- `updatedAt`

### Note on ordering

Use either:

- numeric order values
- lexicographic rank strings

Recommendation for V1:

- numeric order values are fine
- if reorder bugs become annoying later, migrate to fractional ranking or lexicographic ordering

---

## 13. Sync Strategy

## 13.1 Client-side behavior

The extension should maintain:

- current local cache of tasks
- queue of pending mutations
- last successful sync timestamp

On page load:

1. Read cache from `chrome.storage.local`
2. Render immediately
3. If signed in and online, fetch latest data
4. Reconcile differences
5. Update UI and cache

On mutation:

1. Apply optimistic change to UI
2. Save to local cache immediately
3. Send mutation to backend
4. On success, mark synced
5. On failure, keep pending and retry later

---

## 13.2 Conflict handling

V1 strategy:

- last-write-wins on text and completed status
- latest reorder mutation wins for ordering
- if same task edited on two devices, most recent `updatedAt` wins

The coding agent should implement this simply and consistently instead of pretending to support perfect collaborative conflict resolution.

---

## 13.3 Reconnection

When coming back online:

- process pending mutation queue in order
- fetch fresh remote tasks after queue flush
- reconcile and refresh cache

---

## 14. Performance Requirements

Targets:

- shell visible very fast on new tab open
- cached tasks visible nearly instantly
- remote sync should not block interaction
- task interactions should feel immediate

Engineering guidance:

- minimize JS bundle size where reasonable
- avoid huge dependencies
- lazy load settings or non-critical UI
- cache aggressively on client

---

## 15. Security Requirements

Requirements:

- all API traffic over HTTPS
- auth tokens stored carefully
- do not expose admin keys in extension code
- validate all server inputs
- enforce row-level access so users can only access their own tasks

If using Supabase:

- use row-level security
- keep service role keys off client

If using custom backend:

- validate JWT/session server-side
- enforce user ownership in every query

---

## 16. Privacy Expectations

The extension should be modest in permissions and transparent.

Requirements:

- collect only data needed for todo sync
- no creepy tracking
- no reading browsing history
- no unnecessary host permissions
- clear privacy copy on landing page and store listing

---

## 17. Accessibility Requirements

This should not be skipped.

Requirements:

- keyboard navigable
- visible focus states
- decent contrast
- semantic buttons/inputs
- labels where needed
- drag-and-drop should ideally have keyboard fallback or alternate reorder controls

---

## 18. Analytics and Logging

V1 can keep analytics minimal.

Acceptable:

- basic error logging
- optional privacy-safe usage analytics later

Avoid:

- invasive event tracking from day one

Recommended:

- Sentry for errors

---

## 19. Suggested UI Features for Premium Feel

These are not random extras. They directly improve perceived quality.

### High-value polish items

- smooth entrance animation on first paint
- soft shadowed central panel
- rounded corners done tastefully
- hover states that feel responsive
- placeholder skeletons for loading
- toast for undo and sync state
- subtle daily header like date or time
- auto-focus input when useful
- keyboard shortcuts like `/` to focus input
- completed tasks collapsible with count
- empty state illustration or icon

### Strong recommendation

Do a lot of polish on a small set of interactions instead of shipping ten half-baked features.

---

## 20. Detailed UX Behavior Notes

## 20.1 Sync status language

Keep status language calm.

Examples:

- Synced
- Syncing…
- Offline
- Changes saved locally

Avoid scary wording unless data is actually at risk.

## 20.2 Undo behavior

For delete and maybe complete actions:

- show small toast
- action available for a short window
- do not interrupt flow

## 20.3 Input behavior

- trim leading/trailing whitespace
- preserve intentional internal spaces
- prevent accidental giant empty tasks
- support long task text gracefully with wrapping

## 20.4 Completed tasks

- collapsed section label should show count
- should be easy to expand
- bulk clear completed can live in section menu or settings

---

## 21. Developer Experience Requirements

The coding agent should structure the repo cleanly.

Suggested repo structure:

```text
root/
  extension/
    src/
      components/
      pages/
      hooks/
      lib/
      state/
      styles/
    public/
    manifest.json
  backend/              # only if custom backend is used
    src/
  shared/               # optional shared types
  docs/
```

Requirements:

- TypeScript everywhere if possible
- shared types between frontend and backend where practical
- environment variables documented clearly
- setup steps simple enough that future developers do not hate you

---

## 22. Deployment Requirements

## 22.1 Domain setup

Use DNS under `williamwu.ca`.

Possible subdomains:

- `todo.williamwu.ca`
- `api.todo.williamwu.ca`

The coding agent should document DNS records needed for whichever hosting provider is chosen.

## 22.2 Hosting

Good choices:

- Vercel for hosted frontend and maybe API
- Supabase for auth/database
- Railway or Render for custom API

### Recommendation

For speed and sane ops:

- frontend/auth landing page on Vercel
- database/auth on Supabase
- custom API only if needed

---

## 23. Chrome Web Store Readiness

The coding agent should build with store approval in mind.

Requirements:

- minimal permissions
- clear extension description
- polished icon set
- privacy policy page hosted on your domain
- support page hosted on your domain

Useful site pages on `williamwu.ca` or subdomain:

- privacy policy
- support/contact page
- landing page with screenshots

---

## 24. Edge Cases to Handle

The coding agent must think through these.

1. User opens new tab while offline
2. User edits task before remote sync completes
3. User has local tasks then signs in for first time
4. User signs out with cached synced tasks present
5. User edits same task on two devices
6. Backend temporarily fails
7. Reorder request fails after optimistic reorder
8. User has very long task names
9. User has zero tasks
10. User has 500 tasks
11. Auth expires mid-session
12. One device deletes a task while another edits it

---

## 25. Suggested Implementation Order

This order matters.

### Phase 1: core extension shell

- create Manifest V3 extension
- override new tab page
- build polished static todo UI
- implement local-only tasks with `chrome.storage.local`

### Phase 2: premium UX foundation

- inline editing
- drag-and-drop reorder
- theme support
- empty states
- skeleton/loading states
- toasts and subtle motion

### Phase 3: auth and cloud sync

- implement sign-in flow
- add hosted backend/auth under your domain
- add remote persistence
- add merge flow for local to cloud

### Phase 4: sync resilience

- local cache hydration
- optimistic updates
- retry queue
- offline indicator
- conflict handling

### Phase 5: release hardening

- accessibility pass
- performance pass
- settings panel
- icons
- store listing assets
- privacy/support pages

---

## 26. Acceptance Criteria

The project is successful when all of the following are true:

1. Opening a new Chrome tab always loads the custom todo page.
2. User can add, edit, complete, delete, and reorder tasks with no noticeable lag.
3. Tasks persist after browser restart.
4. Signed-in users see the same task list on multiple devices using the extension.
5. Cached tasks appear fast even before remote sync completes.
6. The UI looks polished enough to feel like a real product.
7. Offline use does not destroy user trust.
8. Permissions are minimal and reasonable.
9. Architecture is clean enough to extend later.
10. The extension can be deployed with your `williamwu.ca` domain in the loop for hosted services and branding.

---

## 27. Direct Build Instructions for the Coding Agent

Build a Manifest V3 Chrome extension that overrides the new tab page and presents a premium-feeling todo app with excellent UI and UX. Use React, TypeScript, and Tailwind. Make the experience local-first and instant, with `chrome.storage.local` used for cache and offline resilience. Support anonymous local-only use, but also support account-based sync across devices through a backend hosted under `williamwu.ca` or its subdomains.

Default to a practical architecture that minimizes pain:

- extension frontend in React + TypeScript
- hosted backend/auth/data using Supabase if possible
- Postgres-backed task storage
- strong visual polish
- optimistic UI updates
- background sync
- clear handling of offline and auth states

Prioritize the todo experience itself over extra widgets. The page should look premium, not generic. Focus heavily on spacing, typography, motion, hierarchy, empty states, loading states, and smooth inline editing. Keep permissions minimal. Build with clean structure, store-readiness, and future maintainability in mind.

---

## 28. Final Product Recommendation

The right first version is not a giant productivity dashboard.

It is:

- a beautiful new tab page
- one excellent todo list
- very fast
- synced across devices
- hosted under your brand/domain
- simple enough to finish
- polished enough to impress

That is the correct target.

---

## 29. Implementation Notes Added During Build

This repo now implements the product primarily as a Chrome extension plus direct Supabase integration, instead of a separate custom backend under `api.todo.williamwu.ca`.

### 29.1 Architecture choice used in the codebase

Chosen path:

- extension frontend: React + TypeScript + Tailwind
- local cache: `chrome.storage.local`
- sync/auth/data: direct Supabase client integration
- database: PostgreSQL via Supabase

Why:

- fastest path to a real working V1
- much less auth and persistence plumbing
- still compatible with branding and future hosted pages under `williamwu.ca`

### 29.2 Auth adjustment for extension reality

The original doc preferred Google sign-in or magic links.

The implemented V1 uses email OTP verification codes first.

Reason:

- it avoids fragile redirect handoff inside the extension
- it keeps sign-in entirely inside the new tab UI
- it is simpler to get working reliably in Manifest V3

Google sign-in can still be added later with a hosted auth bridge on `todo.williamwu.ca`.

### 29.3 What this repo now includes

- Manifest V3 extension shell
- polished new tab todo UI
- local-only mode
- optimistic local task persistence
- queue-based sync model
- Supabase schema and RLS policies
- generated icon assets
- architecture, deployment, privacy, support, and release docs

### 29.4 What still requires external setup

The repo cannot itself provision:

- Supabase project creation
- custom domain DNS records
- Vercel or other site hosting for `todo.williamwu.ca`
- Chrome Web Store publishing

Those steps are documented and intentionally left as deployment work rather than hard-coded project behavior.

### 29.5 Current V1 limitations worth documenting honestly

- sync retries happen when the new tab app is open, not from a background worker
- conflict handling is intentionally simple: last-write-wins
- host permissions should be narrowed before Chrome Web Store submission
- Google sign-in is not implemented yet

These are acceptable for V1 and keep the product finishable.

---

## 30. Status Update and Natural Next Steps

This section is intended to make the document useful after the initial implementation pass, not just before it.

### 30.1 What has been completed in the repo

- [x] Created a Manifest V3 Chrome extension structure
- [x] Implemented a new tab override page
- [x] Built the main todo experience in React + TypeScript + Tailwind
- [x] Added local-first persistence using `chrome.storage.local`
- [x] Implemented inline add, edit, complete, delete, and undo flows
- [x] Implemented drag-and-drop reorder for active tasks
- [x] Added completed-task grouping with collapse behavior
- [x] Added sync state language and offline-friendly queued mutations
- [x] Added local-only mode and account/sync mode switching
- [x] Added email OTP auth flow for Supabase-backed sign-in
- [x] Added Supabase-ready remote task/settings sync layer
- [x] Added settings UI for theme, accent, mode, and completed-task behavior
- [x] Added generated icon assets for the extension
- [x] Added repo documentation:
  - `README.md`
  - architecture doc
  - deployment doc
  - privacy policy draft
  - support doc
  - release checklist
- [x] Added Supabase SQL schema and RLS policies
- [x] Built the extension successfully into `extension/dist`

### 30.2 What is not yet completed

These items are not blocked by missing code structure, but they are not fully finished until real infrastructure or release work is done.

- [ ] Create the real Supabase project
- [ ] Run the SQL migration against the real Supabase instance
- [ ] Add real values to `extension/.env.local`
- [ ] Load the built extension in Chrome and test it manually
- [ ] Verify local-only mode end to end in the browser
- [ ] Verify sign-in and sync end to end against the real Supabase project
- [ ] Verify merge behavior when local tasks already exist before sign-in
- [ ] Test on at least two browsers/profiles/devices for real sync validation
- [ ] Publish privacy and support pages under `williamwu.ca`
- [ ] Finalize DNS and hosting for brand-facing pages such as `todo.williamwu.ca`
- [ ] Tighten host permissions before Chrome Web Store submission
- [ ] Create Chrome Web Store listing copy and screenshots

### 30.3 Natural next steps from here

If continuing this project, this is the right order.

1. Connect the real backend
   - Create Supabase
   - run the migration
   - add the real environment variables

2. Validate the shipped extension in Chrome
   - Load `extension/dist`
   - test add/edit/complete/delete/reorder
   - confirm tasks survive browser restart

3. Validate real auth and sync
   - Sign in with email OTP
   - confirm tasks sync across at least two environments
   - test offline edits and later reconciliation

4. Do release hardening
   - tighten permissions
   - perform accessibility pass
   - test long-task and many-task scenarios
   - verify import/merge and sign-out behavior carefully

5. Finish public-facing release materials
   - privacy page
   - support page
   - screenshots
   - store listing copy

### 30.4 Best higher-value improvements after the immediate next steps

Once the real end-to-end sync path is confirmed, the most natural improvements are:

- add a background service worker for more resilient sync retries
- add Google sign-in via a hosted auth bridge on `todo.williamwu.ca`
- narrow host permissions to exact production origins
- add due dates only if they do not dilute the core todo UX
- add automated tests once the manual flows are stable

### 30.5 Recommended definition of “next milestone complete”

The next milestone should be considered complete when all of the following are true:

- the built extension is loaded in Chrome
- local-only mode is verified manually
- Supabase is connected with real credentials
- sign-in works
- tasks sync correctly across at least two environments
- privacy/support pages exist under the branded domain

That would move the project from “implemented in repo” to “real, usable product candidate.”
