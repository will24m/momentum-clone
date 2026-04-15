# Support

## Momentum Todo Workspace Support

If the extension stops syncing or behaves unexpectedly, start with these checks:

1. Confirm the extension is on the latest local build.
2. Verify the Supabase environment variables are present in `extension/.env.local`.
3. Reload the unpacked extension in `chrome://extensions`.
4. Open a fresh new tab and check the sync status banner.
5. If email sign-in fails, verify Supabase email OTP is enabled.

## Common Issues

### Tasks are saving locally but not syncing

- Check whether the app is still in local-only mode.
- Confirm you are signed in.
- Confirm you are online.
- Verify your Supabase host and anon key are correct.

### I signed in and saw an import prompt

That appears when local device tasks and cloud tasks both exist and do not match. Choose merge if you want to keep both sets.

### I signed out and my tasks are still visible

That is expected. The extension keeps the current workspace locally so sign-out does not feel destructive.

## Suggested Public Support Contact

- `support@williamwu.ca`
- or a support page under `todo.williamwu.ca/support`

