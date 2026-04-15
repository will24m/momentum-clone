# Release Checklist

## Product

- Verify add, edit, complete, delete, reorder, and undo flows
- Verify empty state and first-run experience
- Verify settings persist across new tabs
- Verify local-only mode still works with no Supabase config

## Sync

- Verify email OTP sign-in against the real Supabase project
- Verify import decision modal after signing in with existing local tasks
- Verify offline edits replay correctly later
- Verify sign-out returns the app to local mode cleanly

## Quality

- Build the extension with a real Node toolchain
- Check the final manifest contents in `dist/`
- Audit host permissions and tighten them
- Run an accessibility pass with keyboard-only navigation
- Capture screenshots for the Chrome Web Store listing

## Brand/Docs

- Publish privacy policy on `todo.williamwu.ca`
- Publish support page on `todo.williamwu.ca`
- Write Chrome Web Store listing copy
- Add final screenshots and icon previews

