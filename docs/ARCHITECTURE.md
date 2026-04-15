# Architecture

## Overview

This repo implements the product as a local-first Chrome extension with an optional direct-to-Supabase sync layer.

There are four main layers:

1. `extension/`
   The React UI, local persistence, optimistic task interactions, and settings/auth surfaces.
2. `shared/`
   Shared task, auth, settings, and sync queue types.
3. `supabase/migrations/`
   Database schema and RLS policies for authenticated per-user storage.
4. `docs/`
   Operational guidance for setup, deployment, privacy, and release work.

## Frontend Shape

The extension page is the product shell. It is responsible for:

- rendering immediately from local cache
- managing the task list UX
- persisting local state into `chrome.storage.local`
- queueing mutations for later sync
- flushing that queue when the app is in synced mode and online

Key files:

- `extension/src/App.tsx`
- `extension/src/state/appStore.ts`
- `extension/src/lib/chromeStorage.ts`
- `extension/src/lib/remote.ts`

## State Model

The app store keeps:

- visible tasks
- user settings
- auth state
- sync queue and sync health metadata
- onboarding/auth/settings modal state
- toast notifications

Why this shape:

- the app needs instant optimistic updates
- offline edits need to survive tab closes
- cloud sync is optional and should not dominate the core UI

## Local-First Flow

On startup:

1. Load the persisted snapshot from `chrome.storage.local`.
2. Apply theme and render immediately.
3. Restore auth if Supabase is configured.
4. If the user is in cloud mode, refresh remote state.
5. If queued mutations exist, flush them in order.

On mutation:

1. Update UI immediately.
2. Persist the new local snapshot.
3. If in cloud mode, add a mutation to the queue.
4. Try to flush the queue right away if online.

## Auth Choice

The planning document recommended Google or magic links. This repo uses email OTP verification codes for V1 because it is much cleaner in an extension context than redirect-based flows.

What that means:

- no hosted callback bridge is required for the current code path
- users can authenticate fully inside the extension UI
- Google sign-in can still be added later through a hosted page under `todo.williamwu.ca`

## Sync Model

The sync layer uses direct Supabase access from the extension.

Current behaviors:

- optimistic task creation/update/delete
- persisted mutation queue
- retry on later app opens when online
- remote refresh after queue flush
- import decision modal when local and cloud task sets differ after sign-in

Conflict strategy:

- task text and completion use last-write-wins
- reorder uses the latest ordered snapshot
- deleted tasks are soft-deleted remotely

## Known Constraints

- There is no background service worker sync yet.
- The queue only flushes while the new tab page is open.
- Google sign-in is not implemented.
- Host permissions are broader than ideal until the final production domain is locked down.

