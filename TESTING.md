# CreatorGrid — Smoke-test checklist

This checklist is for a fresh, self-created workspace in Preview. The managed database is shared with production; do not test by editing or deleting another user's records. The seeded collaborators are fictional profiles, not sign-in accounts. Do not enter confidential material.

## Validation already run

- TypeScript diagnostics: passed (`pnpm check`).
- Unit tests: passed (8 tests across 2 files), covering password hashing/verification, email normalization, session logout/cookie behavior, and platform integration helpers.
- Production bundle: passed (`pnpm build`).
- Runtime health endpoint and the 15-route JSON manifest: returned HTTP 200 and valid responses.
- Safety guards: a workspace write without the app request marker returned 403; a form-encoded sign-in request returned 415.
- Full browser end-to-end mutations were not run because the managed database is shared with production.

## Manual Preview checklist

1. **Create an account and workspace.** Sign up with an email you control, an 8+ character password, and privacy consent. Confirm the first workspace opens; sign out, sign in again, and verify the workspace is still available.
2. **Create a scheduled piece.** Open Calendar and choose “Add to calendar.” Enter a title, description, channel, content type, status, and publish date. Confirm it appears on the chosen day in Month and Week views. Open its detail page, change the publish date, save, and confirm the calendar moves it.
3. **Move work through production.** Open the production board and move an item through Idea → Drafting → In production → In review → Scheduled → Published. Confirm the status persists after refresh.
4. **Edit and discuss a brief.** Open a content item, edit its title/description and brief, save, add a comment, and request review. Confirm the pending approval appears on the Approvals page.
5. **Resolve an approval.** Approve a review and verify the content moves to Scheduled. For a separate review request, request changes and verify the content returns to Drafting.
6. **Find and organize content.** Search by title, filter by channel, save a view, reload, then apply that saved view.
7. **Add a reference asset.** Add a URL to the asset library and open it from the library. The MVP stores links and bundled sample files; binary uploads are not enabled.
8. **Review fictional analytics and the safe upgrade flow.** Confirm performance totals and channel breakdowns reflect the seeded fictional records. Use “Try Creator Pro · test only” or “Preview Team · test only”; the workspace plan updates, but no card details are requested and no payment is submitted.
9. **Check role restrictions.** As the workspace owner, change a seeded collaborator's role. Verify the owner role is protected. Viewer-write rejection is enforced by the API; seeded collaborators cannot sign in.
10. **Check password recovery.** In Preview/development, request a reset link and use the one-time link within 30 minutes. Outbound reset email is not configured; production does not send a reset email until an email provider is added.

## Known limits and post-MVP upgrades

- Configure transactional email delivery so production password-reset links reach users.
- Add secure, expiring guest/client review links with higher-tier entitlements.
- Add member invitations, persistent workspace preferences, and account-profile editing.
- Enable durable file uploads and richer tag management.
- Add isolated integration/end-to-end tests and, when needed, real payment and analytics providers. No live billing or social API is connected in this MVP.
