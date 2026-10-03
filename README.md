# Oyzu UI kit

An experimental design system for Oyzu, built with React, TypeScript, shadcn/ui (Radix Nova), Tailwind CSS and Storybook.

The first playground explores workspace editing and a three-step setup flow. All data is fictional and lives in memory; refreshing resets it. No external service or account is connected.

## Run

Use Node.js 24 and npm 11 (the initial verified toolchain).

```sh
npm ci
npm run dev
npm run storybook
```

Vite serves the playground; Storybook serves the component and experience catalog on port 6006.

## Try the interactions

- **Edit details:** enter invalid values, save changes, or press Escape after editing to inspect discard protection.
- **Set up a connection:** name it, choose a behavior, go back, and review before creating it.
- **Save behavior:** choose success, a three-second delay, or failure before opening a flow. Failure mode fails every attempt so retry and draft retention can be inspected.
- **Preferences:** toggle the session-only notification preference.
- **Pattern notes:** read the provisional interaction principles.

These are experiments for review, not accepted production contracts or a published npm package. The visual direction is provisional.

## Ownership and contracts

- `src/components/ui/`: upstream shadcn primitives, added through its CLI. Keep upstream attribution.
- `src/components/patterns/flow-dialog.tsx`: shared asynchronous form lifecycle, submission feedback and dirty-close confirmation. Callers supply values, validation and an async operation. Rejected operations remain visible without losing input. A pending operation blocks dismissal and duplicate submission.
- `src/components/patterns/wizard-dialog.tsx`: step navigation and progress. Callers supply step content, optional validation and a final async operation. Navigation does not own domain values.
- `src/components/patterns/text-field.tsx`: label, input, help and accessible error association.
- `src/App.tsx`: example composition, fake workspace values and injected save scenarios. Product policy, credentials and real network operations do not belong in the UI patterns.
- `src/index.css` and `src/App.css`: initial theme and visual experiments; patterns currently require both stylesheets.
- `src/examples/`: Storybook catalog.
- `tests/`: browser tests through supported user interactions.

The accepted direction for this experiment is shadcn as a starting foundation, with Oyzu-owned interaction patterns layered above it. Success means editable details validate and save; failures preserve drafts; dirty dismissals require confirmation; wizard back navigation preserves answers; and both flows work on a narrow screen and by keyboard.

## Verification

```sh
npx playwright install chromium
npm run build
npm run lint
npm test
npm run build-storybook
```

Playwright covers validation, persistence within the session, dismissal, slow and failed saves, wizard navigation, mobile fit and automated axe accessibility checks. Automated checks do not substitute for assistive-technology and human usability review.

## Development and attribution

First-party implementation, tests and scripts are AI-generated; people direct, review and approve changes. This first experiment was directed in conversation and generated with Codex. Maintainer review is still pending. Dependencies and imported components retain their original authorship and licenses.

The shadcn notice is in `THIRD_PARTY_NOTICES.md`. First-party open-source licensing and package publication are intentionally not selected by this experiment; the package remains private until the repository's release policy is established.

## Name and identifier pattern

See [IDENTITY.md](IDENTITY.md) for the Harness research, provisional rules and ownership boundary. In the connection wizard, type a friendly name to generate an identifier, use Edit identifier to customize it, then create and edit the connection to verify that only its friendly name changes. Add another connection with the same name to try collision handling. Storybook includes generated, custom and saved states under Patterns / Name and identifier.

## Component gallery

Use **Browse components** in the preview header (or **Components** in the desktop sidebar). The gallery includes:

- Resource table: name/identifier cells, sorting, search, status filtering, per-page selection, cross-page bulk selection, pagination, row menus and a details dialog.
- Confirmed removal: explicit typed confirmation, pending state, disabled duplicate submissions and recoverable failure. Sample data only.
- Form controls: labeled select, textarea with character count, checkbox, validation, switches and managed/disabled preferences.
- Status and feedback: five status badges, pending indicator, information/success/warning/error banners, and dismissible notifications.
- Empty and loading states: first-use and filtered-empty states, skeleton rows, determinate progress, and a recoverable error example.
- Supporting shadcn primitives: alert dialog, dropdown menu, tooltip, accordion, checkbox, select, textarea, table, skeleton and progress.

Ownership: shared behavior lives in src/components/patterns; resource values, filtering policy and demo operations live in src/examples/component-gallery.tsx. ResourceTable owns local sorting, pagination and visible-page selection; selection is controlled by its consumer. It renders typed column definitions and never fetches data. ConfirmAction invokes an injected async operation and never treats a rejection as success. Feedback and empty-state components accept content and caller-provided actions.

New patterns use src/components/patterns/catalog.css along with the existing theme. Gallery-only layout styles live beside the example. New Storybook entries cover the gallery, status badges, feedback, empty states and success/failure confirmation dialogs.

The imported Progress primitive is adjusted to pass its value to Radix so assistive technology receives the same progress value that is rendered visually.

## Nested account navigation

Open `/#account/profile` (or choose Account) for an interactive page with Profile, Security, API keys and Notifications sections. `SectionNavigation` owns the responsive navigation presentation: ordinary links with `aria-current` on desktop and a labeled section picker on small screens. The example owns URL hash navigation, fictional data and session-only state; links support deep linking and browser Back/Forward. Draft profile changes survive section switches while the account page stays mounted, but are not persisted across reloads or leaving the account example. Security and key actions operate on sample records only.

The shared navigation pattern lives in `src/components/patterns/section-navigation.tsx`; account-specific content lives in `src/examples/account-settings.tsx`. Browser tests cover history, draft retention, saving, sample-key revocation, responsive navigation and automated accessibility checks.

## Visual language

`src/design.css` owns the shared visual styling for the app and Storybook, including portal dialogs and menus. Warm neutral surfaces, charcoal text, strong heading hierarchy, fine dividers and small control radii replace nested pale-blue cards. Official Oyzu blue is reserved for actions, selected navigation and restrained accents. Keep identifier editing compact. Account settings, workspace settings and the gallery use this same foundation.

## Full page studies

Open `/#pages/resources`, `/#pages/detail` or `/#pages/activity` to explore sparse full-page compositions. These examples use up to 1840px of available content width, with fluid gutters. Tables span the primary region even with only two rows; empty states stay aligned to the top left. Detail and activity pages use a flexible primary region and a 240–290px secondary rail; the rail moves below at smaller widths. Prose remains limited to 65 characters per line. `PageLayout` owns this reusable structure; fictional content and interactions live in `full-pages.tsx`. Use the content selector to compare empty, sparse and populated lists.

## Searchable resource picker

The resource list includes a Filter by project picker. `ResourcePicker` owns a searchable selection dialog with name/identifier search, keyboard navigation, recent groups, unavailable options and clearing. The caller supplies resources, the selected identifier and recent history; no storage or authorization rules live in the pattern. Escape cancels without changing the selection and closing returns focus to the trigger. The example keeps five recent choices in session state. Storybook includes 200 fictional resources to exercise longer lists. The dialog uses a bounded scrolling results region and mobile viewport sizing.

## List actions

Project names are links to full pages; identifiers remain separate, selectable text. Quick view opens a side drawer (full screen on phones). A persistent row menu offers Open page, Edit and Delete. Edit reuses the shared dirty-form lifecycle and preserves identifiers; Delete names the target and requires confirmation. Closing returns focus to the invoking control; deleting a row moves focus to list search. Filters and selection remain in the mounted list. All mutations are session-only examples.

## Full-page connection editor

Open `/#pages/connection` for Basics, Authentication and Behavior sections, optional advanced settings, and a persistent save/cancel bar that appears for modified drafts. Creation reuses `IdentityFields`; after a successful save the identifier is immutable. Validation focuses the first invalid field and opens advanced settings when required. Failed saves retain the draft; pending saves disable editing and app navigation. `useGuardedHash` coordinates unsaved-change prompts for app links, navigation buttons and hash history, plus the browser before-unload warning. Explicit Cancel changes restores the last saved snapshot. The example uses fictional credential references and never sends requests or persists configuration across reloads. Save behavior controls provide successful, failed and slow-save scenarios.

## Connection wizard and scoped secret references

`/#pages/connection-wizard` demonstrates Basics → Authentication → Behavior → Review & test. Authentication choices include anonymous, username/password via a secret reference, API token reference, simulated OAuth, and managed identity. The review contains reference metadata only. Configuration or context changes invalidate test success; creation requires a successful simulated test. Outcomes include invalid credentials, insufficient permissions and unreachable service. Save failures retain the draft and test result. No network authentication, secret retrieval or durable creation occurs.

`/#pages/secrets` demonstrates the reusable `SecretSelector`. Callers supply already-authorized reference metadata and receive a selected reference ID. It builds on `ResourcePicker` search and keyboard behavior, adding scope filtering. The example uses one explicit Account → Organization → Project → Component lineage and allows current scope plus ancestors. Project-to-descendant-component visibility remains unresolved; this example is not authoritative access policy. Production must authorize exact scope instances server-side and revalidate at test/save time. The picker neither resolves values nor grants access. Context changes clear the example selection. Both references have Storybook entries.

## Members & access

Open `/#pages/members` for a searchable, role/status-filtered organization membership list and a scoped-access drawer. Row actions cover role changes, pending-invitation resend/revoke and member removal. Role review states the organization role before/after, inherited project/component changes and unchanged account access. Pending members show proposed access after acceptance. These fictional roles and inheritance rules are UI examples, not authorization policy.

Invitations accept one or up to 20 comma/newline-separated addresses, validate the entire batch, reject repeated/existing addresses, and present a role/access summary before creating pending records. No email is sent. Action behavior supports slow actions and a one-shot failure so drafts and confirmations can be retried in place. Successful deletions remove only the organization record, clear its selection and move focus to the list heading; separate account access is described as unchanged. Shared `FlowDialog`, `ConfirmAction` and table contracts own interaction mechanics; `members-model.ts` owns fictional role definitions and invitation validation. Browser tests cover filtering, all four scopes, invitation validation/review/retry, role impact and focus, resend/revoke/removal, pending submission protection, and mobile/accessibility behavior. Storybook includes the full example.

### Global sidebar navigation

`NavigationSidebar` owns responsive presentation, group disclosure, accessible icon-rail labels, and drawer focus. Desktop users can collapse to an icon rail; mobile users get a modal drawer with Escape/outside dismissal and focus restoration. Accepted navigation closes the drawer and focuses the main content; the existing unsaved-change guard can defer navigation without dismissing the menu. Resizing to desktop closes the drawer and focuses the sidebar toggle.

Example destinations and grouping live in `src/examples/navigation.ts`. The URL is the active-page source of truth, including browser history. Group toggles never navigate. Navigating to a page reveals its group. `src/examples/sidebar-preferences.ts` stores desktop collapse and group preferences locally; temporary mobile opening is not persisted. Storage failure falls back to in-memory behavior. Workspace, Connections, Personal and UI library are exploratory groupings, not a production information architecture.

### Sidebar account and session reference

`AccountMenu` presents the caller's identity and account destinations using the shared dropdown primitive. The sidebar renders it at the bottom in both drawer and desktop modes; the compact rail keeps an accessible avatar trigger. Example profile saves update the sidebar identity, and profile drafts survive navigation and cancellation of logout. Confirmed logout clears the draft.

`SessionExample` is a fictional sign-in/sign-out experience, not authentication. It collects no credentials and calls no identity provider. A per-tab sessionStorage flag remembers the signed-out preview; profile data remains in memory. The demo includes pending and retryable failed sign-in states. Actual authentication, session revocation, email verification, and authorization require server-owned contracts in a consuming application.
