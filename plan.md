# CreatorGrid — Implementation Plan

## Product scope

A desktop-first content planning and production-management workspace for solo digital creators, small media teams, and creator agencies. The MVP centers on ideas, briefs/scripts, publishing schedules, assets, review/approval, and fictional performance tracking. It does not integrate with social publishing APIs. Upgrade actions are test-only; there is no live billing.

## Implementation approach

Use the initialized React + TypeScript + Vite client, Express server, Drizzle ORM, and managed MySQL database. Keep domain logic in typed Express JSON endpoints in `server/api.ts`; all workspace-scoped reads/writes are guarded by authenticated membership. Store relational production data in MySQL, including audit timestamps and foreign keys. Keep browser routes in Wouter; server endpoints remain under `/api/`. The calendar schedule is the content item's `publishAt` value, so the calendar reads and updates the same source of truth instead of duplicating it in a separate table.

### Authentication and authorization

The attached brief explicitly requests email sign-up/sign-in and password reset, so use email/password rather than the starter's Manus OAuth flow. Store normalized unique email addresses and scrypt password hashes (never plaintext). Establish a signed, HTTP-only application session cookie with `SameSite=None; Secure` for the public HTTPS Preview context; keep local HTTP development cookie behavior separate. Protect all workspace routes and enforce owner/editor/contributor/viewer permissions in server procedures. Implement single-use, expiring password-reset tokens and a reset request flow. No outbound-email provider was specified: in development only, surface the reset URL to support testing; in production, clearly indicate that delivery is unconfigured and do not claim an email was sent. Never accept arbitrary redirect URLs.

### Data model

Extend the starter users table with credential and consent fields, and add workspaces, workspace memberships, brands/channels, content types, content items, briefs, assets, tags and content-tag relations, comments, approvals, and performance records. Tie all tenant-owned rows to a workspace and scope server queries to current membership. Use fictional demonstration content and collaborator profile records with no password hashes or sessions; these placeholder profiles cannot authenticate and have no demo credentials. Seed only after a newly created workspace needs its starter content. Do not run destructive SQL or write test mutations to the shared managed database.

### User experience and views

Create a cohesive CreatorGrid shell with a persistent left navigation, compact workspace/channel context, a focused top bar, high-signal content summaries, and low-friction detail panels. Use a light editorial workspace aesthetic with warm neutral surfaces, ink-colored typography, and a distinctive persimmon accent; use clear status colors sparingly. Typography pairs a crisp sans-serif interface face with a restrained editorial display face. Use concise production-oriented language, clear keyboard focus, semantic landmarks, labeled inputs and accessible contrast.

Implement these views: public landing page; sign-in and sign-up/password reset; dashboard; content calendar; production board; content library; content item/brief editor; asset library; approvals; performance; settings; and pricing. Core actions include create/edit content, change stage, set schedule, edit brief/script, store asset links, comment, approve/reject, search/filter, and inspect seeded fictional metrics. Keep responsive behavior, with calendar/board/review optimized for desktop and laptop.

### Design system

Three low-probability style alternatives: Candy-bright creator SaaS (0.08), Neo-brutalist studio board (0.06), and Airy magazine workbench (0.09). Choose **Airy magazine workbench**: calm editorial utility with a warm, tactile workspace mood.

- **Design Movement:** Contemporary editorial publishing translated into a creator's production workbench.
- **Core Principles:** Legible at a glance; warm but restrained; action near context; status color communicates meaning rather than decoration.
- **Color Philosophy:** Soft paper and oat surfaces reduce fatigue; charcoal ink anchors hierarchy; persimmon signals creation and the CreatorGrid brand; sage, muted lilac, blue and ochre distinguish workflow states.
- **Layout Paradigm:** A persistent, narrow left rail anchors navigation; a broad, scrollable work surface gives the calendar and board room; compact detail panels and sticky local actions keep decisions beside the content.
- **Signature Elements:** Four-tile CreatorGrid mark; small pill-shaped stage labels; paper-like content cards with fine dividers and restrained cover art.
- **Interaction Philosophy:** Direct manipulation for status and schedule changes, visible save/approval feedback, clear disabled states for view-only roles, and confirmation before destructive actions.
- **Animation:** Keep motion quiet: 140–200 ms color/position transitions for hover and state changes, short fade/slide for dialogs, no looping decoration or motion that delays routine work; honor reduced-motion preferences.
- **Typography System:** Manrope for headings and numeric emphasis; DM Sans for interface text, labels and forms; tight display tracking only on large headings and generous line-height for briefs.
- **Brand Essence:** A planning studio for creators who want their ideas to move from spark to publish with less friction; **thoughtful, capable, warm**.
- **Brand Voice:** Clear, encouraging, specific. Examples: “A good week is taking shape.” “Keep the cadence, not just the numbers.”
- **Wordmark & Logo:** Lowercase `creatorgrid` wordmark paired with a compact four-tile mark suggesting ideas moving through a grid of work.
- **Signature Brand Color:** Persimmon `#e86c4f`, reserved for primary creation actions and the brand mark.

### Project structure

- `client/src/App.tsx` — route table and application providers.
- `client/src/pages/` — page-level views grouped by route/domain.
- `client/src/contexts/CreatorGridContext.tsx` — typed app-session and workspace-data context.
- `client/src/styles.css` — application-specific layout and component styles layered onto the starter tokens.
- `client/src/components/` — app shell, content cards, board/calendar, review panel and shared accessible controls.
- `client/src/lib/` — tRPC client and UI/domain utilities.
- `client/src/index.css` — design tokens, global type, focus and responsive rules.
- `server/_core/` — existing Express bootstrap, auth/session middleware and tRPC foundation.
- `server/api.ts` — JSON account and workspace endpoints, tenant scoping and role checks.
- `server/routers.ts` — retained starter tRPC system/auth adapter.
- `server/db.ts` — database client and domain persistence helpers.
- `drizzle/schema.ts`, `drizzle/relations.ts`, `drizzle/*.sql` — relational schema, relations and additive migrations.
- `shared/` — shared types/constants where client/server contracts need common definitions.
- `public/manus-routes.json` — complete client page-route manifest.

### Dependencies and constraints

Prefer existing starter dependencies and avoid unnecessary integrations. The starter's managed database is shared by development and published runtime; migrations must be additive and deterministic. Keep demo data fictional. Password-reset tokens are single-use and time-limited; because no email provider was specified, the current development build surfaces a reset link only in development, while production responds without claiming that email was sent. File records can reference a bundled demo illustration or a stable link; user file uploads are not configured. Do not add external social APIs, live payment credentials, or claim email delivery without a configured provider. Preserve the starter's platform/session integration where compatible with the explicitly requested email/password flow.

## Validation and handoff

Use registered TypeScript diagnostics; run the project typecheck, tests, and production build. Verify the route manifest is served as JSON and aligned with client routes. Perform focused code-level checks for calendar dates, status transitions and approval outcomes without destructive or shared-database test writes. Fix any confirmed issues, refine visual consistency, and provide the current Preview plus a testing checklist and optional post-MVP upgrades.
