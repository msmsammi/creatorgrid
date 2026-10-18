# CreatorGrid MVP — TODO

## 1. Full-stack workspace and account foundation
- [x] Create a full-stack web app with frontend, backend, database, authentication and a modern but practical creative-work interface.
- [x] The app serves solo creators; YouTubers and podcasters; small social-media teams; and creative agencies managing multiple channels.
- [x] The core workflow lets a user create an account and workspace; create channels or brands; capture content ideas; turn ideas into content briefs; plan content on a calendar; move content through stages such as idea, drafting, production, review, scheduled and published; store links to scripts, assets and drafts; receive comments and approvals; and track published content and performance metrics.
- [x] The data model includes users, workspaces, brands or channels, content items, content types, calendar entries, briefs, assets, comments, approvals, performance records and tags.
- [ ] Provide email sign-up, sign-in and password reset.
- [x] Provide team roles such as owner, editor, contributor and viewer.

## 2. Content planning and workflow views
- [x] Provide a content calendar view.
- [x] Provide a Kanban production board.
- [x] Provide a content item detail page.
- [x] Provide a brief or script editor.
- [x] Provide an asset library with file or link records.
- [x] Provide review comments and an approval flow.
- [x] Provide search, filters and saved views.
- [x] Provide a dashboard with content pipeline summaries.

## 3. Demo data and performance tracking
- [x] Provide basic performance tracking using fictional seeded metrics.
- [x] Provide demo data for a realistic content team.
- [x] Use fictional demo content and fictional analytics.

## 4. Product pages and workspace navigation
- [x] Provide a landing page.
- [x] Provide login and sign-up.
- [x] Provide a dashboard.
- [x] Provide a content calendar.
- [x] Provide a production board.
- [x] Provide a content library.
- [x] Provide a brief editor.
- [x] Provide an asset library.
- [x] Provide an approvals page.
- [x] Provide a performance page.
- [x] Provide settings.
- [x] Provide a pricing page.

## 5. Pricing and safe upgrade flow
- [x] Offer a free solo plan, a paid creator pro plan, and a paid team plan.
- [ ] Support optional client review access in higher tiers.
- [x] Show an upgrade flow with test payments only.

## 6. Accessibility, visual consistency and responsive behavior
- [x] Make the app desktop-first for the calendar, workflow board and review panels.
- [x] Keep the interface clean, modern and creative but not cluttered.
- [x] Maintain strong hierarchy and easy scanning.
- [x] Make the interface comfortable for heavy daily use.
- [x] Keep the app responsive but optimised for desktop and laptop.
- [x] Provide accessible controls and forms.

## 7. MVP scope boundaries and build handoff
- [x] Keep the MVP focused on planning and workflow.
- [x] Do not add unnecessary social-media API complexity.
- [x] Make the product suitable for a solo founder or small team.
- [x] At the end, provide a working app, fictional creator-team demo data, a testing checklist, and a short list of optional post-MVP upgrades.

## 8. Build, test and refinement workflow
- [x] First create the app plan and schema.
- [x] Then generate the app.
- [ ] Then test calendar, workflow and approval flows.
- [x] Then fix missing or broken parts.
- [x] Then refine UX and visual consistency.

## Implementation notes

The sign-up/sign-in flows and password-reset token flow are implemented, but outbound reset email is not configured: Preview/development exposes a one-time development link, while production does not claim to send email. The pricing page labels client review as a planned add-on; external client invitation/sharing is not implemented. Calendar entries are stored as each content item's `publishAt` timestamp. Seeded collaborator profiles have no password hashes or sessions and cannot sign in.

The calendar, production and approval paths were reviewed and compiled; full browser end-to-end mutations were not run because the managed database is shared with production. The handoff checklist provides safe user-driven scenarios.
